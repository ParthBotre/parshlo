import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type BusinessType as PrismaBusinessType,
  type GstRate as PrismaGstRate,
  Prisma,
} from '@parshlo/db';
import { JobProducer } from '@parshlo/queue';
import {
  type AttachCourierReceiptInput,
  type CourierReceiptRef,
  type GstRate,
  type OrderItemView,
  ORDER_STATUS_TRANSITIONS,
  type OrderStatus,
  type OrderView,
  type PlaceOrderInput,
  type PlaceOrderOnBehalfInput,
  type ProductPriceTier,
  type UpdateOrderBeforeApprovalInput,
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
const COURIER_PARTNER_NAMES: Record<
  'PROFESSIONAL' | 'MARK' | 'TEJ' | 'SHIPKART' | 'VISHWA',
  string
> = {
  PROFESSIONAL: 'Professional Couriers',
  MARK: 'Mark Couriers',
  TEJ: 'Tej Couriers',
  SHIPKART: 'SHIPKART',
  VISHWA: 'VISHWA COURIERS',
};
const ADMIN_APPROVAL_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

function priceTierForBusinessType(businessType?: PrismaBusinessType | null): ProductPriceTier {
  return businessType === 'CHEMIST' ? 'RATE_B' : 'RATE_A';
}

@Injectable()
export class OrderService {
  private readonly log = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobProducer,
    private readonly config: ConfigService,
  ) {}

  /**
   * Place a new B2B order with full transactional safety:
   *   1. Verify buyer is APPROVED.
   *   2. Lock product rows + inventory rows.
   *   3. Validate stock and prescription/schedule requirements.
   *   4. Snapshot pricing & GST onto OrderItem (immutable).
   *   5. Reserve inventory atomically.
   *   6. Honor Idempotency-Key — return prior order on retry.
   */
  /** Staff-only: place an order attributed to an approved buyer account. */
  async placeOrderOnBehalf(
    actorId: string,
    input: PlaceOrderOnBehalfInput,
    actorRoles: readonly string[] = [],
  ): Promise<OrderView> {
    const target = await this.prisma.user.findUnique({
      where: { id: input.buyerId, deletedAt: null },
    });
    if (!target?.roles.includes('BUYER')) {
      throw new BadRequestException({
        code: 'INVALID_BUYER',
        message: 'Selected account is not a buyer.',
      });
    }
    const { buyerId, ...orderInput } = input;
    return this.placeOrder(buyerId, orderInput, { actorId, actorRoles });
  }

  async placeOrder(
    buyerId: string,
    input: PlaceOrderInput,
    options?: { actorId?: string; actorRoles?: readonly string[] },
  ): Promise<OrderView> {
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
    const businessProfile = buyer?.businessProfile;
    if (!buyer || buyer.accountStatus !== 'APPROVED' || !businessProfile) {
      throw new ForbiddenException({ code: 'ACCOUNT_NOT_APPROVED' });
    }
    if (
      !options?.actorId &&
      input.items.some((item) => item.schemeFreeQuantity > 0 || item.discountPaise > 0)
    ) {
      throw new ForbiddenException({
        code: 'ORDER_ADJUSTMENT_FORBIDDEN',
        message: 'Only staff can apply schemes, free quantity, or discounts.',
      });
    }

    const order = await this.prisma.$transaction(
      async (tx) => {
        const productIds = input.items.map((i) => i.productId);
        const products = await tx.product.findMany({
          where: { id: { in: productIds }, deletedAt: null },
        });
        if (products.length !== productIds.length) {
          throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND' });
        }

        const itemData: Prisma.OrderItemCreateManyOrderInput[] = [];
        let subtotal = 0n;
        let gstTotal = 0n;

        for (const item of input.items) {
          const product = products.find((p) => p.id === item.productId);
          if (!product || product.status !== 'ACTIVE') {
            throw new BadRequestException({
              code: 'PRODUCT_UNAVAILABLE',
              message: `Product ${item.productId} is not available.`,
            });
          }
          const freeQty = item.schemeFreeQuantity;

          const defaultTier = priceTierForBusinessType(businessProfile.businessType);
          const requestedTier =
            options?.actorId && options.actorId !== buyerId
              ? (item.priceTier ?? defaultTier)
              : defaultTier;
          const unit =
            requestedTier === 'RATE_B'
              ? product.rateBPaise || product.wholesalePricePaise
              : product.rateAPaise || product.wholesalePricePaise;
          const qty = BigInt(item.quantity);
          const undiscountedSubtotal = unit * qty;
          const discount = BigInt(item.discountPaise);
          if (discount > undiscountedSubtotal) {
            throw new BadRequestException({
              code: 'DISCOUNT_EXCEEDS_LINE_SUBTOTAL',
              message: `Discount cannot exceed subtotal for ${product.name}.`,
            });
          }
          const lineSubtotal = undiscountedSubtotal - discount;
          const lineGst = 0n;
          const lineTotal = lineSubtotal + lineGst;

          itemData.push({
            productId: product.id,
            productNameSnapshot: product.name.toUpperCase(),
            quantity: item.quantity,
            schemeFreeQuantity: freeQty,
            priceTier: requestedTier,
            unitPricePaise: unit,
            discountPaise: discount,
            gstRate: product.gstRate,
            lineSubtotalPaise: lineSubtotal,
            lineGstPaise: lineGst,
            lineTotalPaise: lineTotal,
          });

          subtotal += lineSubtotal;
          gstTotal += lineGst;
        }

        const orderNumber = await this.nextOrderNumber(tx);
        const placedByStaff = Boolean(options?.actorId && options.actorId !== buyerId);
        const requiresAdminReview =
          placedByStaff &&
          !(options?.actorRoles ?? []).some((role) => ADMIN_APPROVAL_ROLES.has(role));
        const initialStatus: OrderStatus = requiresAdminReview ? 'UNDER_REVIEW' : 'RECEIVED';
        const created = await tx.order.create({
          data: {
            orderNumber,
            buyerId,
            status: initialStatus,
            buyerBusinessName: businessProfile.businessName,
            buyerGstin: businessProfile.gstin,
            purchaseOrderNumber: input.purchaseOrderNumber ?? null,
            notes: input.notes ?? null,
            subtotalPaise: subtotal,
            gstPaise: gstTotal,
            totalPaise: subtotal + gstTotal,
            idempotencyKey: input.idempotencyKey,
            items: { createMany: { data: itemData } },
            statusEvents: {
              create: { status: initialStatus, actorId: options?.actorId ?? buyerId },
            },
          },
          include: { items: true },
        });

        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    const view = await this.getOrder(order.id, buyerId);
    const orderPlacer =
      options?.actorId && options.actorId !== buyerId
        ? await this.prisma.user.findUnique({
            where: { id: options.actorId },
            select: { email: true, fullName: true },
          })
        : { email: buyer.email, fullName: buyer.fullName };

    // Side-effects after commit. Best-effort: failures are logged but never
    // propagate back to the user — their order is already durable.
    void this.dispatchOrderPlacedSideEffects(
      view,
      orderPlacer?.email ?? buyer.email,
      orderPlacer?.fullName ?? buyer.fullName,
    ).catch((err: unknown) => {
      this.log.error({ err, orderId: view.id }, 'failed to dispatch order-placed side effects');
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

    const sideEffects: Promise<unknown>[] = [];

    if (this.config.get<boolean>('features.emailNotificationsEnabled') === true) {
      const adminRecipients = await this.getOrderNotificationRecipients();
      sideEffects.push(
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
          to: adminRecipients,
          data: {
            orderNumber: order.orderNumber,
            buyerBusinessName: order.buyerBusinessName,
            buyerGstin: order.buyerGstin,
            totalPaise: order.totalPaise,
            itemCount: order.items.length,
            adminUrl,
          },
        }),
      );
    }

    if (this.config.get<boolean>('features.invoiceGenerationEnabled') === true) {
      sideEffects.push(this.jobs.enqueueInvoice({ orderId: order.id }));
    }

    await Promise.allSettled(sideEffects);
  }

  private async getOrderNotificationRecipients(): Promise<string | string[]> {
    const configured = process.env.ADMIN_NOTIFICATION_EMAIL?.trim();
    if (configured) {
      return configured;
    }

    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        accountStatus: 'APPROVED',
        roles: { hasSome: ['ADMIN', 'SUPER_ADMIN'] },
      },
      select: { email: true },
    });
    const emails = Array.from(new Set(users.map((user) => user.email).filter(Boolean)));
    if (emails.length > 0) {
      return emails;
    }
    return process.env.ADMIN_NOTIFICATION_EMAIL ?? 'admin@parshlo.local';
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
      throw new ForbiddenException({ code: 'NOT_ORDER_OWNER' });
    }
    return this.toView(order, order.items);
  }

  /** Full order detail for admin / sales staff. */
  async getOrderById(orderId: string): Promise<OrderView> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND' });
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

  async attachCourierReceipt(
    orderId: string,
    input: AttachCourierReceiptInput,
  ): Promise<OrderView> {
    this.assertCourierReceiptRef(orderId, input);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND' });
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        courierReceiptBucket: input.bucket,
        courierReceiptKey: input.key,
        courierReceiptContentType: input.contentType,
        courierReceiptUploadedAt: new Date(),
      },
      include: { items: true },
    });

    return this.toView(updated, updated.items);
  }

  async updateCourierTracking(
    orderId: string,
    input: {
      courierService: 'PROFESSIONAL' | 'MARK' | 'TEJ' | 'SHIPKART' | 'VISHWA';
      docketNumber: string;
      freightAmountPaise?: number;
      weightKg?: number;
      boxCount: number;
    },
  ): Promise<OrderView> {
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order) {
        throw new NotFoundException({ code: 'ORDER_NOT_FOUND' });
      }

      const courierName = COURIER_PARTNER_NAMES[input.courierService];
      const courier =
        (await tx.courierPartner.findFirst({ where: { name: courierName, isActive: true } })) ??
        (await tx.courierPartner.create({ data: { name: courierName } }));

      const existingForOrder = await tx.adminConsignmentLog.findFirst({
        where: { type: 'OUTGOING', associatedOrderNumber: order.orderNumber },
      });
      if (existingForOrder?.statementId) {
        throw new BadRequestException({
          code: 'CONSIGNMENT_ALREADY_RECONCILED',
          message:
            'This shipment is already tied to a logistics statement. Resolve finance reconciliation before editing courier details.',
        });
      }

      const docketOwner = await tx.adminConsignmentLog.findUnique({
        where: {
          courierId_docketNumber: {
            courierId: courier.id,
            docketNumber: input.docketNumber,
          },
        },
      });
      if (docketOwner && docketOwner.id !== existingForOrder?.id) {
        throw new ConflictException({
          code: 'DOCKET_ALREADY_EXISTS',
          message: 'This courier docket is already logged in logistics.',
        });
      }

      const trackingSetAt = order.courierTrackingSetAt ?? now;
      const consignmentDate = order.dispatchedAt ?? trackingSetAt;
      const freightAmountPaise =
        input.freightAmountPaise === undefined ? undefined : BigInt(input.freightAmountPaise);

      if (existingForOrder) {
        await tx.adminConsignmentLog.update({
          where: { id: existingForOrder.id },
          data: {
            courierId: courier.id,
            docketNumber: input.docketNumber,
            consignmentDate,
            amountPaise: freightAmountPaise ?? existingForOrder.amountPaise,
            weightKg: input.weightKg,
            boxCount: input.boxCount,
            associatedPoNumber: order.purchaseOrderNumber,
          },
        });
      } else {
        await tx.adminConsignmentLog.create({
          data: {
            courierId: courier.id,
            type: 'OUTGOING',
            docketNumber: input.docketNumber,
            consignmentDate,
            amountPaise: freightAmountPaise ?? 0n,
            weightKg: input.weightKg,
            boxCount: input.boxCount,
            associatedOrderNumber: order.orderNumber,
            associatedPoNumber: order.purchaseOrderNumber,
          },
        });
      }

      return tx.order.update({
        where: { id: orderId },
        data: {
          courierService: input.courierService,
          courierDocketNumber: input.docketNumber,
          courierTrackingUpdatedAt: now,
          ...(order.courierTrackingSetAt == null ? { courierTrackingSetAt: now } : {}),
        },
        include: { items: true },
      });
    });

    return this.toView(updated, updated.items);
  }

  async updateStatus(
    orderId: string,
    actorId: string,
    input: UpdateOrderStatusInput,
    actorRoles: readonly string[] = [],
  ): Promise<OrderView> {
    const isAdminApprover = actorRoles.some((role) => ADMIN_APPROVAL_ROLES.has(role));
    if (!isAdminApprover) {
      throw new ForbiddenException({
        code: 'ADMIN_APPROVAL_REQUIRED',
        message: 'Only an admin or super admin can update order status.',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order) {
        throw new NotFoundException({ code: 'ORDER_NOT_FOUND' });
      }
      if (!ORDER_STATUS_TRANSITIONS[order.status].includes(input.status)) {
        throw new BadRequestException({
          code: 'INVALID_STATE_TRANSITION',
          message: `Cannot transition ${order.status} → ${input.status}.`,
        });
      }
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: input.status,
          dispatchedAt: input.status === 'DISPATCHED' ? new Date() : undefined,
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

  async updateBeforeApproval(
    orderId: string,
    actorRoles: readonly string[],
    input: UpdateOrderBeforeApprovalInput,
  ): Promise<OrderView> {
    const isAdminApprover = actorRoles.some((role) => ADMIN_APPROVAL_ROLES.has(role));
    if (!isAdminApprover) {
      throw new ForbiddenException({
        code: 'ADMIN_REQUIRED',
        message: 'Only an admin or super admin can edit an order before approval.',
      });
    }

    const productIds = input.items.map((item) => item.productId);
    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException({
        code: 'DUPLICATE_ORDER_ITEM',
        message: 'Each product can appear only once in an order edit.',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { buyer: { include: { businessProfile: true } }, items: true },
      });
      if (!order) {
        throw new NotFoundException({ code: 'ORDER_NOT_FOUND' });
      }
      const isSuperAdmin = actorRoles.includes('SUPER_ADMIN');
      const editableBeforeApproval = order.status === 'RECEIVED' || order.status === 'UNDER_REVIEW';
      const superAdminEditableAfterApproval =
        isSuperAdmin && (order.status === 'APPROVED' || order.status === 'PREPARING');
      if (!editableBeforeApproval && !superAdminEditableAfterApproval) {
        throw new BadRequestException({
          code: 'ORDER_NOT_EDITABLE',
          message:
            order.status === 'APPROVED' || order.status === 'PREPARING'
              ? 'Only super admins can edit approved orders before dispatch.'
              : 'Orders can be edited only before dispatch.',
        });
      }
      const businessProfile = order.buyer.businessProfile;
      if (!businessProfile) {
        throw new BadRequestException({
          code: 'BUYER_PROFILE_MISSING',
          message: 'Buyer profile is missing.',
        });
      }

      const products = await tx.product.findMany({
        where: { id: { in: productIds }, deletedAt: null },
      });
      if (products.length !== productIds.length) {
        throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND' });
      }

      if (superAdminEditableAfterApproval) {
        const existingByProductId = new Map(order.items.map((item) => [item.productId, item]));
        for (const item of input.items) {
          const existing = existingByProductId.get(item.productId);
          if (existing && existing.discountPaise !== BigInt(item.discountPaise)) {
            throw new BadRequestException({
              code: 'ORDER_APPROVED_ITEMS_FIXED',
              message: 'Approved orders cannot edit discounts.',
            });
          }
        }
      }

      const defaultTier = priceTierForBusinessType(businessProfile.businessType);
      const itemData: Prisma.OrderItemCreateManyOrderInput[] = [];
      let subtotal = 0n;

      for (const item of input.items) {
        const product = products.find((p) => p.id === item.productId);
        if (!product || product.status !== 'ACTIVE') {
          throw new BadRequestException({
            code: 'PRODUCT_UNAVAILABLE',
            message: `Product ${item.productId} is not available.`,
          });
        }

        const requestedTier = item.priceTier ?? defaultTier;
        const unit =
          requestedTier === 'RATE_B'
            ? product.rateBPaise || product.wholesalePricePaise
            : product.rateAPaise || product.wholesalePricePaise;
        const undiscountedSubtotal = unit * BigInt(item.quantity);
        const discount = BigInt(item.discountPaise);
        if (discount > undiscountedSubtotal) {
          throw new BadRequestException({
            code: 'DISCOUNT_EXCEEDS_LINE_SUBTOTAL',
            message: `Discount cannot exceed subtotal for ${product.name}.`,
          });
        }
        const lineSubtotal = undiscountedSubtotal - discount;

        itemData.push({
          productId: product.id,
          productNameSnapshot: product.name.toUpperCase(),
          quantity: item.quantity,
          schemeFreeQuantity: item.schemeFreeQuantity,
          priceTier: requestedTier,
          unitPricePaise: unit,
          discountPaise: discount,
          gstRate: product.gstRate,
          lineSubtotalPaise: lineSubtotal,
          lineGstPaise: 0n,
          lineTotalPaise: lineSubtotal,
        });
        subtotal += lineSubtotal;
      }

      await tx.orderItem.deleteMany({ where: { orderId } });
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          purchaseOrderNumber: input.purchaseOrderNumber ?? null,
          notes: input.notes ?? null,
          subtotalPaise: subtotal,
          gstPaise: 0n,
          totalPaise: subtotal,
          items: { createMany: { data: itemData } },
        },
        include: { items: true },
      });

      return this.toView(updated, updated.items);
    });
  }

  async deleteOrder(orderId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { invoice: true },
      });
      if (!order) {
        throw new NotFoundException({ code: 'ORDER_NOT_FOUND' });
      }
      if (order.invoice) {
        throw new ConflictException({
          code: 'ORDER_HAS_INVOICE',
          message: 'Orders with generated invoices cannot be deleted.',
        });
      }

      const logisticsEntry = await tx.adminConsignmentLog.findFirst({
        where: { associatedOrderNumber: order.orderNumber },
        select: { id: true },
      });
      if (logisticsEntry) {
        throw new ConflictException({
          code: 'ORDER_HAS_LOGISTICS_ENTRY',
          message: 'Orders linked to logistics cannot be deleted.',
        });
      }

      await tx.order.delete({ where: { id: orderId } });
    });
  }

  private assertCourierReceiptRef(orderId: string, receipt: CourierReceiptRef): void {
    if (this.config.get<boolean>('features.storageEnabled') !== true) {
      throw new ServiceUnavailableException({
        code: 'STORAGE_DISABLED',
        message: 'File storage is disabled for this environment.',
      });
    }
    const bucket = this.config.get<string>('aws.s3.invoicesBucket', { infer: true }) ?? '';
    if (receipt.bucket !== bucket) {
      throw new BadRequestException({ code: 'INVALID_COURIER_RECEIPT_BUCKET' });
    }
    const prefix = `courier-receipts/${orderId}/`;
    if (!receipt.key.startsWith(prefix)) {
      throw new BadRequestException({ code: 'INVALID_COURIER_RECEIPT_KEY' });
    }
    if (
      !['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(receipt.contentType)
    ) {
      throw new BadRequestException({ code: 'CONTENT_TYPE_NOT_ALLOWED' });
    }
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
      courierReceiptContentType: string | null;
      courierReceiptUploadedAt: Date | null;
      courierService: 'PROFESSIONAL' | 'MARK' | 'TEJ' | 'SHIPKART' | 'VISHWA' | null;
      courierDocketNumber: string | null;
      courierTrackingSetAt: Date | null;
      courierTrackingUpdatedAt: Date | null;
    },
    items: {
      productId: string;
      productNameSnapshot: string;
      quantity: number;
      unitPricePaise: bigint;
      schemeFreeQuantity: number;
      discountPaise: bigint;
      priceTier: ProductPriceTier;
      gstRate: PrismaGstRate;
      lineSubtotalPaise: bigint;
      lineGstPaise: bigint;
      lineTotalPaise: bigint;
    }[],
  ): OrderView {
    const itemViews: OrderItemView[] = items.map((i) => ({
      productId: i.productId,
      productName: i.productNameSnapshot,
      quantity: i.quantity,
      schemeFreeQuantity: i.schemeFreeQuantity,
      unitPricePaise: Number(i.unitPricePaise),
      discountPaise: Number(i.discountPaise),
      priceTier: i.priceTier,
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
      courierReceipt:
        order.courierReceiptUploadedAt && order.courierReceiptContentType
          ? {
              contentType: order.courierReceiptContentType,
              uploadedAt: order.courierReceiptUploadedAt.toISOString(),
            }
          : null,
      courierTracking:
        order.courierService && order.courierDocketNumber
          ? {
              service: order.courierService,
              docketNumber: order.courierDocketNumber,
              bookedAt:
                (order.courierTrackingSetAt ?? order.courierTrackingUpdatedAt)?.toISOString() ??
                order.updatedAt.toISOString(),
              updatedAt:
                (order.courierTrackingUpdatedAt ?? order.courierTrackingSetAt)?.toISOString() ??
                order.updatedAt.toISOString(),
            }
          : null,
    };
  }
}
