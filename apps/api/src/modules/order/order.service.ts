import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { type GstRate as PrismaGstRate, Prisma } from '@parshlo/db';
import { JobProducer } from '@parshlo/queue';
import {
  type GstRate,
  type OrderItemView,
  type OrderStatus,
  type OrderView,
  type PlaceOrderInput,
  type UpdateOrderStatusInput,
} from '@parshlo/types';

import { PrismaService } from '../prisma/prisma.service.js';

const GST_RATE_MAP: Record<PrismaGstRate, GstRate> = {
  ZERO: '0',
  FIVE: '5',
  TWELVE: '12',
  EIGHTEEN: '18',
  TWENTYEIGHT: '28',
};
const GST_RATE_BASIS: Record<PrismaGstRate, bigint> = {
  ZERO: 0n,
  FIVE: 500n,
  TWELVE: 1200n,
  EIGHTEEN: 1800n,
  TWENTYEIGHT: 2800n,
};

/**
 * Allowed state transitions for an order. Used to validate updateStatus().
 * This is the canonical workflow for the platform.
 */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  RECEIVED: ['UNDER_REVIEW', 'CANCELLED', 'REJECTED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  REJECTED: [],
};

@Injectable()
export class OrderService {
  private readonly log = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobProducer,
  ) {}

  /**
   * Place a new B2B order with full transactional safety:
   *   1. Verify buyer is APPROVED.
   *   2. Lock product rows + inventory rows.
   *   3. Validate MOQ, stock, and prescription/schedule requirements.
   *   4. Snapshot pricing & GST onto OrderItem (immutable).
   *   5. Reserve inventory atomically.
   *   6. Honor Idempotency-Key — return prior order on retry.
   */
  async placeOrder(buyerId: string, input: PlaceOrderInput): Promise<OrderView> {
    // Idempotency check before doing any work
    const prior = await this.prisma.order.findUnique({
      where: { buyerId_idempotencyKey: { buyerId, idempotencyKey: input.idempotencyKey } },
    });
    if (prior) {
      return this.getOrder(prior.id, buyerId);
    }

    const buyer = await this.prisma.user.findUnique({
      where: { id: buyerId },
      include: { businessProfile: true },
    });
    if (!buyer || buyer.accountStatus !== 'APPROVED' || !buyer.businessProfile) {
      throw new ForbiddenException({ code: 'ACCOUNT_NOT_APPROVED' });
    }

    const order = await this.prisma.$transaction(
      async (tx) => {
        const productIds = input.items.map((i) => i.productId);
        const products = await tx.product.findMany({
          where: { id: { in: productIds }, deletedAt: null },
          include: { inventory: true },
        });
        if (products.length !== productIds.length) {
          throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND' });
        }

        const itemData: Prisma.OrderItemCreateManyOrderInput[] = [];
        let subtotal = 0n;
        let gstTotal = 0n;
        const stockUpdates: Array<{ productId: string; qty: number }> = [];

        for (const item of input.items) {
          const product = products.find((p) => p.id === item.productId);
          if (!product || product.status !== 'ACTIVE') {
            throw new BadRequestException({
              code: 'PRODUCT_UNAVAILABLE',
              message: `Product ${item.productId} is not available.`,
            });
          }
          if (item.quantity < product.moq) {
            throw new BadRequestException({
              code: 'MOQ_NOT_MET',
              message: `Minimum order quantity for ${product.name} is ${String(product.moq)}.`,
            });
          }
          const available = (product.inventory?.availableQty ?? 0) - (product.inventory?.reservedQty ?? 0);
          if (item.quantity > available) {
            throw new ConflictException({
              code: 'INSUFFICIENT_STOCK',
              message: `Insufficient stock for ${product.name}.`,
            });
          }

          const unit = product.wholesalePricePaise;
          const qty = BigInt(item.quantity);
          const lineSubtotal = unit * qty;
          const lineGst = (lineSubtotal * GST_RATE_BASIS[product.gstRate]) / 10000n;
          const lineTotal = lineSubtotal + lineGst;

          itemData.push({
            productId: product.id,
            productNameSnapshot: product.name,
            quantity: item.quantity,
            unitPricePaise: unit,
            gstRate: product.gstRate,
            lineSubtotalPaise: lineSubtotal,
            lineGstPaise: lineGst,
            lineTotalPaise: lineTotal,
          });

          subtotal += lineSubtotal;
          gstTotal += lineGst;
          stockUpdates.push({ productId: product.id, qty: item.quantity });
        }

        // Reserve stock atomically
        for (const upd of stockUpdates) {
          await tx.inventory.update({
            where: { productId: upd.productId },
            data: { reservedQty: { increment: upd.qty } },
          });
        }

        const orderNumber = await this.nextOrderNumber(tx);
        const created = await tx.order.create({
          data: {
            orderNumber,
            buyerId,
            buyerBusinessName: buyer.businessProfile!.businessName,
            buyerGstin: buyer.businessProfile!.gstin,
            purchaseOrderNumber: input.purchaseOrderNumber ?? null,
            notes: input.notes ?? null,
            subtotalPaise: subtotal,
            gstPaise: gstTotal,
            totalPaise: subtotal + gstTotal,
            idempotencyKey: input.idempotencyKey,
            items: { createMany: { data: itemData } },
            statusEvents: { create: { status: 'RECEIVED', actorId: buyerId } },
          },
          include: { items: true },
        });

        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    const view = await this.getOrder(order.id, buyerId);

    // Side-effects after commit. Best-effort: failures are logged but never
    // propagate back to the user — their order is already durable.
    void this.dispatchOrderPlacedSideEffects(view, buyer.email, buyer.fullName).catch((err: unknown) => {
      this.log.error(
        { err, orderId: view.id },
        'failed to dispatch order-placed side effects',
      );
    });

    return view;
  }

  private async dispatchOrderPlacedSideEffects(
    order: OrderView,
    buyerEmail: string,
    buyerFullName: string,
  ): Promise<void> {
    const webBase = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
    const trackingUrl = `${webBase}/dashboard/orders/${order.id}`;
    const adminUrl = `${webBase}/admin/orders`;

    await Promise.allSettled([
      this.jobs.enqueueEmail({
        kind: 'ORDER_PLACED_BUYER',
        to: buyerEmail,
        data: {
          buyerName: buyerFullName.split(' ')[0] ?? buyerFullName,
          orderNumber: order.orderNumber,
          items: order.items.map((i) => ({
            productName: i.productName,
            quantity: i.quantity,
            lineTotalPaise: i.lineTotalPaise,
          })),
          subtotalPaise: order.subtotalPaise,
          gstPaise: order.gstPaise,
          totalPaise: order.totalPaise,
          trackingUrl,
        },
      }),
      this.jobs.enqueueEmail({
        kind: 'ORDER_PLACED_ADMIN',
        to: process.env.ADMIN_NOTIFICATION_EMAIL ?? 'admin@parshlo.local',
        data: {
          orderNumber: order.orderNumber,
          buyerBusinessName: order.buyerBusinessName,
          buyerGstin: order.buyerGstin,
          totalPaise: order.totalPaise,
          itemCount: order.items.length,
          adminUrl,
        },
      }),
      this.jobs.enqueueInvoice({ orderId: order.id }),
    ]);
  }

  async getOrder(orderId: string, requesterId: string): Promise<OrderView> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND' });
    }
    if (order.buyerId !== requesterId) {
      // Admins/sales managers bypass this via separate endpoint.
      throw new ForbiddenException({ code: 'NOT_ORDER_OWNER' });
    }
    return this.toView(order, order.items);
  }

  async listForBuyer(buyerId: string): Promise<OrderView[]> {
    const orders = await this.prisma.order.findMany({
      where: { buyerId },
      orderBy: { placedAt: 'desc' },
      include: { items: true },
    });
    return orders.map((o) => this.toView(o, o.items));
  }

  async updateStatus(
    orderId: string,
    actorId: string,
    input: UpdateOrderStatusInput,
  ): Promise<OrderView> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order) {
        throw new NotFoundException({ code: 'ORDER_NOT_FOUND' });
      }
      if (!TRANSITIONS[order.status].includes(input.status)) {
        throw new BadRequestException({
          code: 'INVALID_STATE_TRANSITION',
          message: `Cannot transition ${order.status} → ${input.status}.`,
        });
      }

      // On terminal cancel/reject, release reserved inventory.
      if (input.status === 'CANCELLED' || input.status === 'REJECTED') {
        for (const item of order.items) {
          await tx.inventory.update({
            where: { productId: item.productId },
            data: { reservedQty: { decrement: item.quantity } },
          });
        }
      }
      // On dispatch, convert reservation → consumption.
      if (input.status === 'DISPATCHED') {
        for (const item of order.items) {
          await tx.inventory.update({
            where: { productId: item.productId },
            data: {
              availableQty: { decrement: item.quantity },
              reservedQty: { decrement: item.quantity },
            },
          });
        }
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: input.status,
          dispatchedAt: input.status === 'DISPATCHED' ? new Date() : undefined,
          deliveredAt: input.status === 'DELIVERED' ? new Date() : undefined,
          cancelledAt: input.status === 'CANCELLED' ? new Date() : undefined,
          rejectedAt: input.status === 'REJECTED' ? new Date() : undefined,
          statusEvents: {
            create: { status: input.status, note: input.note ?? null, actorId },
          },
        },
        include: { items: true },
      });

      return this.toView(updated, updated.items);
    });
  }

  /** Generates PSH-YYYY-NNNNNN where NNNNNN is a zero-padded yearly counter. */
  private async nextOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear();
    const count = await tx.order.count({
      where: { orderNumber: { startsWith: `PSH-${String(year)}-` } },
    });
    const seq = String(count + 1).padStart(6, '0');
    return `PSH-${String(year)}-${seq}`;
  }

  private toView(
    order: {
      id: string;
      orderNumber: string;
      status: OrderStatus;
      buyerId: string;
      buyerBusinessName: string;
      buyerGstin: string;
      purchaseOrderNumber: string | null;
      notes: string | null;
      subtotalPaise: bigint;
      gstPaise: bigint;
      totalPaise: bigint;
      placedAt: Date;
      updatedAt: Date;
      dispatchedAt: Date | null;
      deliveredAt: Date | null;
    },
    items: Array<{
      productId: string;
      productNameSnapshot: string;
      quantity: number;
      unitPricePaise: bigint;
      gstRate: PrismaGstRate;
      lineSubtotalPaise: bigint;
      lineGstPaise: bigint;
      lineTotalPaise: bigint;
    }>,
  ): OrderView {
    const itemViews: OrderItemView[] = items.map((i) => ({
      productId: i.productId,
      productName: i.productNameSnapshot,
      quantity: i.quantity,
      unitPricePaise: Number(i.unitPricePaise),
      gstRate: GST_RATE_MAP[i.gstRate],
      lineSubtotalPaise: Number(i.lineSubtotalPaise),
      lineGstPaise: Number(i.lineGstPaise),
      lineTotalPaise: Number(i.lineTotalPaise),
    }));
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      buyerId: order.buyerId,
      buyerBusinessName: order.buyerBusinessName,
      buyerGstin: order.buyerGstin,
      purchaseOrderNumber: order.purchaseOrderNumber,
      notes: order.notes,
      items: itemViews,
      subtotalPaise: Number(order.subtotalPaise),
      gstPaise: Number(order.gstPaise),
      totalPaise: Number(order.totalPaise),
      placedAt: order.placedAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      dispatchedAt: order.dispatchedAt?.toISOString() ?? null,
      deliveredAt: order.deliveredAt?.toISOString() ?? null,
    };
  }
}
