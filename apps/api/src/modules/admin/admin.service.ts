import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Prisma } from '@parshlo/db';
import { JobProducer } from '@parshlo/queue';
import {
  type ArchiveHrEmployeeInput,
  type AdminCreateBuyerInput,
  type AdminCreateEmployeeInput,
  type CreateHrExpenseInput,
  type CreateLeaveRequestInput,
  type GenerateHrDocumentInput,
  type GenerateHrDocumentResponse,
  type GenerateHrSalarySlipInput,
  type GenerateHrSalarySlipResponse,
  type AdminUpdateBuyerInput,
  type AdminEmployeeView,
  type AdminUpdateEmployeeInput,
  type EmployeeRole,
  type EmployeeLeaveBalanceView,
  type EmployeeLeaveDashboardView,
  type EmployeeLeaveRequestView,
  type HrDashboardView,
  type HrDocumentView,
  type HrEmployeeRecordView,
  type HrExpenseView,
  type HrSalarySlipView,
  type HrWorkLogView,
  type OrderStatus,
  type ReviewHrExpenseInput,
  type ReviewLeaveRequestInput,
  type UpsertHrEmployeeRecordInput,
  type UpsertHrWorkLogInput,
} from '@parshlo/types';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

import { PrismaService } from '../prisma/prisma.service.js';

const ORDER_STATUSES: OrderStatus[] = [
  'RECEIVED',
  'UNDER_REVIEW',
  'APPROVED',
  'PREPARING',
  'DISPATCHED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'REJECTED',
];

const BUYER_ANALYTICS_PERIODS = ['day', 'week', 'month', 'year'] as const;
type BuyerAnalyticsPeriod = (typeof BUYER_ANALYTICS_PERIODS)[number];

const EMPLOYEE_ROLES: EmployeeRole[] = ['SALES_MANAGER', 'ADMIN', 'SUPER_ADMIN'];
const EMPLOYEE_LEAVE_ENTITLEMENT_DAYS = 30;

interface BuyerPeriodSummary {
  orderCount: number;
  totalPaise: number;
  averageOrderPaise: number;
}

interface BuyerOrderSummary {
  totalOrders: number;
  totalPaise: number;
  currentMonthOrders: number;
  currentMonthPaise: number;
  averageOrderPaise: number;
  latestOrderNumber: string | null;
  latestOrderStatus: string | null;
  latestOrderAt: string | null;
  statusCounts: Record<OrderStatus, number>;
  periodAnalytics: Record<BuyerAnalyticsPeriod, BuyerPeriodSummary>;
}

interface BuyerRow {
  id: string;
  email: string;
  fullName: string;
  accountStatus: string;
  businessName: string | null;
  gstin: string | null;
  pan: string | null;
  mobile: string | null;
  businessEmail: string | null;
  businessType: string | null;
  drugLicenseNumber: string | null;
  pharmacyRegistrationNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pin: string | null;
  country: string | null;
  createdAt: string;
  orderSummary: BuyerOrderSummary;
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function inclusiveDayCount(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
}

function yearBounds(year: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)),
  };
}

function monthBounds(month: string): { start: Date; end: Date; daysInMonth: number } {
  const [year, monthNumber] = month.split('-').map((part) => Number.parseInt(part, 10));
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 0, 23, 59, 59, 999));
  return { start, end, daysInMonth: end.getUTCDate() };
}

function fiscalYearLabel(value: Date): string {
  const year = value.getUTCFullYear();
  const month = value.getUTCMonth() + 1;
  const start = month >= 4 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

function toNumber(value: bigint | number): number {
  return Number(value);
}

function splitSalary(grossMonthlyPaise: number): {
  basicMonthlyPaise: number;
  hraMonthlyPaise: number;
  specialAllowanceMonthlyPaise: number;
} {
  const basicMonthlyPaise = Math.round(grossMonthlyPaise * 0.5);
  const hraMonthlyPaise = Math.round(grossMonthlyPaise * 0.4);
  return {
    basicMonthlyPaise,
    hraMonthlyPaise,
    specialAllowanceMonthlyPaise: Math.max(
      0,
      grossMonthlyPaise - basicMonthlyPaise - hraMonthlyPaise,
    ),
  };
}

function formatInr(paise: number): string {
  return `Rs. ${(paise / 100).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

interface BuyerRecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  placedAt: string;
  totalPaise: number;
  itemCount: number;
  courierService: string | null;
  courierDocketNumber: string | null;
}

interface BuyerDetail extends BuyerRow {
  recentOrders: BuyerRecentOrder[];
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobProducer,
    private readonly config: ConfigService,
  ) {}

  private normalizeUpper(value: string): string {
    return value.trim().toUpperCase();
  }

  private normalizeOptionalUpper(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed.toUpperCase() : null;
  }

  private normalizeOptionalText(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private normalizeEmail(value: string): string {
    return value.trim().toLowerCase();
  }

  private async nextUnregisteredGstin(tx: Prisma.TransactionClient): Promise<string> {
    const rows = await tx.$queryRaw<{ next_value: number | bigint }[]>`
      SELECT COALESCE(MAX(CAST(REPLACE("gstin", 'UNREGISTERED-', '') AS INTEGER)), 0) + 1 AS next_value
      FROM "BusinessProfile"
      WHERE "gstin" ~ '^UNREGISTERED-[0-9]+$'
    `;
    const nextValue = Number(rows[0]?.next_value ?? 1);
    return `UNREGISTERED-${String(nextValue).padStart(3, '0')}`;
  }

  private async resolveBuyerGstin(
    tx: Prisma.TransactionClient,
    rawGstin?: string,
  ): Promise<string> {
    const gstin = rawGstin?.trim().toUpperCase() ?? '';
    return gstin.length > 0 && gstin !== 'UNREGISTERED' ? gstin : this.nextUnregisteredGstin(tx);
  }

  private toEmployeeView(user: {
    id: string;
    auth0Id: string;
    email: string;
    fullName: string;
    roles: string[];
    accountStatus: string;
    suspendedAt: Date | null;
    suspensionReason: string | null;
    lastLoginAt: Date | null;
    lastLoginIp: string | null;
    createdAt: Date;
  }): AdminEmployeeView {
    const primaryRole = EMPLOYEE_ROLES.find((role) => user.roles.includes(role));
    if (!primaryRole) {
      throw new BadRequestException({ code: 'EMPLOYEE_ROLE_REQUIRED' });
    }
    return {
      id: user.id,
      auth0Id: user.auth0Id,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles as AdminEmployeeView['roles'],
      primaryRole,
      accountStatus: user.accountStatus as AdminEmployeeView['accountStatus'],
      suspendedAt: user.suspendedAt?.toISOString() ?? null,
      suspensionReason: user.suspensionReason,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      lastLoginIp: user.lastLoginIp,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private emptyBuyerPeriodSummary(): BuyerPeriodSummary {
    return { orderCount: 0, totalPaise: 0, averageOrderPaise: 0 };
  }

  private emptyBuyerOrderSummary(): BuyerOrderSummary {
    return {
      totalOrders: 0,
      totalPaise: 0,
      currentMonthOrders: 0,
      currentMonthPaise: 0,
      averageOrderPaise: 0,
      latestOrderNumber: null,
      latestOrderStatus: null,
      latestOrderAt: null,
      statusCounts: Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0])) as Record<
        OrderStatus,
        number
      >,
      periodAnalytics: Object.fromEntries(
        BUYER_ANALYTICS_PERIODS.map((period) => [period, this.emptyBuyerPeriodSummary()]),
      ) as Record<BuyerAnalyticsPeriod, BuyerPeriodSummary>,
    };
  }

  private toBuyerRow(
    user: {
      id: string;
      email: string;
      fullName: string;
      accountStatus: string;
      createdAt: Date;
      businessProfile: {
        businessName: string;
        gstin: string;
        pan: string | null;
        mobile: string;
        businessEmail: string;
        businessType: string;
        drugLicenseNumber: string;
        pharmacyRegistrationNumber: string | null;
        addressLine1: string;
        addressLine2: string | null;
        city: string;
        state: string;
        pin: string | null;
        country: string;
      } | null;
    },
    orderSummary: BuyerOrderSummary = this.emptyBuyerOrderSummary(),
  ): BuyerRow {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      accountStatus: user.accountStatus,
      businessName: user.businessProfile?.businessName ?? null,
      gstin: user.businessProfile?.gstin ?? null,
      pan: user.businessProfile?.pan ?? null,
      mobile: user.businessProfile?.mobile ?? null,
      businessEmail: user.businessProfile?.businessEmail ?? null,
      businessType: user.businessProfile?.businessType ?? null,
      drugLicenseNumber: user.businessProfile?.drugLicenseNumber ?? null,
      pharmacyRegistrationNumber: user.businessProfile?.pharmacyRegistrationNumber ?? null,
      addressLine1: user.businessProfile?.addressLine1 ?? null,
      addressLine2: user.businessProfile?.addressLine2 ?? null,
      city: user.businessProfile?.city ?? null,
      state: user.businessProfile?.state ?? null,
      pin: user.businessProfile?.pin ?? null,
      country: user.businessProfile?.country ?? null,
      createdAt: user.createdAt.toISOString(),
      orderSummary,
    };
  }

  async listAllOrders(filters: { status?: OrderStatus; take?: number }): Promise<
    {
      id: string;
      orderNumber: string;
      buyerId: string;
      status: string;
      placedAt: string;
      buyerBusinessName: string;
      buyerFullName: string;
      buyerGstin: string;
      buyerCity: string;
      buyerState: string;
      totalPaise: number;
      itemCount: number;
      rateTierSummary: 'RATE_A' | 'RATE_B' | 'MIXED';
      hasCourierReceipt: boolean;
      courierService: string | null;
      courierDocketNumber: string | null;
      courierTrackingUpdatedAt: string | null;
    }[]
  > {
    const orders = await this.prisma.order.findMany({
      where: filters.status ? { status: filters.status } : undefined,
      orderBy: { placedAt: 'desc' },
      take: Math.min(filters.take ?? 500, 500),
      include: {
        _count: { select: { items: true } },
        items: { select: { priceTier: true } },
        buyer: {
          select: {
            fullName: true,
            businessProfile: { select: { city: true, state: true } },
          },
        },
      },
    });
    return orders.map((o) => {
      const tiers = new Set(o.items.map((item) => item.priceTier));
      const rateTierSummary =
        tiers.size === 1 && o.items[0] ? o.items[0].priceTier : ('MIXED' as const);
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        buyerId: o.buyerId,
        status: o.status,
        placedAt: o.placedAt.toISOString(),
        buyerBusinessName: o.buyerBusinessName,
        buyerFullName: o.buyer.fullName,
        buyerGstin: o.buyerGstin,
        buyerCity: o.buyer.businessProfile?.city.trim() ?? 'Unknown',
        buyerState: o.buyer.businessProfile?.state.trim() ?? 'Unknown',
        totalPaise: Number(o.totalPaise),
        itemCount: o._count.items,
        rateTierSummary,
        hasCourierReceipt: Boolean(o.courierReceiptBucket && o.courierReceiptKey),
        courierService: o.courierService,
        courierDocketNumber: o.courierDocketNumber,
        courierTrackingUpdatedAt: o.courierTrackingUpdatedAt?.toISOString() ?? null,
      };
    });
  }

  async listBuyers(): Promise<BuyerRow[]> {
    const users = await this.prisma.user.findMany({
      where: { roles: { has: 'BUYER' }, deletedAt: null },
      include: { businessProfile: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const buyerIds = users.map((user) => user.id);
    if (buyerIds.length === 0) return [];

    const periodStarts = AdminService.businessPeriodStarts();
    const [
      lifetime,
      currentDay,
      currentWeek,
      currentMonth,
      currentYear,
      statusGroups,
      latestOrders,
    ] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['buyerId'],
        where: { buyerId: { in: buyerIds } },
        _count: { _all: true },
        _sum: { totalPaise: true },
      }),
      this.prisma.order.groupBy({
        by: ['buyerId'],
        where: { buyerId: { in: buyerIds }, placedAt: { gte: periodStarts.day } },
        _count: { _all: true },
        _sum: { totalPaise: true },
      }),
      this.prisma.order.groupBy({
        by: ['buyerId'],
        where: { buyerId: { in: buyerIds }, placedAt: { gte: periodStarts.week } },
        _count: { _all: true },
        _sum: { totalPaise: true },
      }),
      this.prisma.order.groupBy({
        by: ['buyerId'],
        where: { buyerId: { in: buyerIds }, placedAt: { gte: periodStarts.month } },
        _count: { _all: true },
        _sum: { totalPaise: true },
      }),
      this.prisma.order.groupBy({
        by: ['buyerId'],
        where: { buyerId: { in: buyerIds }, placedAt: { gte: periodStarts.year } },
        _count: { _all: true },
        _sum: { totalPaise: true },
      }),
      this.prisma.order.groupBy({
        by: ['buyerId', 'status'],
        where: { buyerId: { in: buyerIds } },
        _count: { _all: true },
      }),
      this.prisma.order.findMany({
        where: { buyerId: { in: buyerIds } },
        orderBy: { placedAt: 'desc' },
        select: {
          buyerId: true,
          orderNumber: true,
          status: true,
          placedAt: true,
        },
      }),
    ]);

    const summaries = new Map<string, BuyerOrderSummary>();
    for (const buyerId of buyerIds) {
      summaries.set(buyerId, this.emptyBuyerOrderSummary());
    }

    for (const row of lifetime) {
      const summary = summaries.get(row.buyerId);
      if (!summary) continue;
      summary.totalOrders = row._count._all;
      summary.totalPaise = Number(row._sum.totalPaise ?? 0n);
      summary.averageOrderPaise =
        summary.totalOrders > 0 ? Math.round(summary.totalPaise / summary.totalOrders) : 0;
    }

    const applyPeriodRows = (period: BuyerAnalyticsPeriod, rows: typeof currentMonth): void => {
      for (const row of rows) {
        const summary = summaries.get(row.buyerId);
        if (!summary) continue;
        const orderCount = row._count._all;
        const totalPaise = Number(row._sum.totalPaise ?? 0n);
        summary.periodAnalytics[period] = {
          orderCount,
          totalPaise,
          averageOrderPaise: orderCount > 0 ? Math.round(totalPaise / orderCount) : 0,
        };
      }
    };

    applyPeriodRows('day', currentDay);
    applyPeriodRows('week', currentWeek);
    applyPeriodRows('month', currentMonth);
    applyPeriodRows('year', currentYear);

    for (const row of currentMonth) {
      const summary = summaries.get(row.buyerId);
      if (!summary) continue;
      summary.currentMonthOrders = row._count._all;
      summary.currentMonthPaise = Number(row._sum.totalPaise ?? 0n);
    }

    for (const row of statusGroups) {
      const summary = summaries.get(row.buyerId);
      if (!summary) continue;
      summary.statusCounts[row.status] = row._count._all;
    }

    for (const order of latestOrders) {
      const summary = summaries.get(order.buyerId);
      if (!summary || summary.latestOrderAt) continue;
      summary.latestOrderNumber = order.orderNumber;
      summary.latestOrderStatus = order.status;
      summary.latestOrderAt = order.placedAt.toISOString();
    }

    return users
      .map((u) => this.toBuyerRow(u, summaries.get(u.id)))
      .sort((a, b) => {
        const aName = (a.businessName ?? a.fullName).trim();
        const bName = (b.businessName ?? b.fullName).trim();
        return aName.localeCompare(bName, 'en-IN', { sensitivity: 'base' });
      });
  }

  async getBuyer(
    id: string,
    filters: { period?: string; anchor?: string } = {},
  ): Promise<BuyerDetail> {
    const user = await this.prisma.user.findFirst({
      where: { id, roles: { has: 'BUYER' }, deletedAt: null },
      include: { businessProfile: true },
    });
    if (!user) {
      throw new NotFoundException({ code: 'BUYER_NOT_FOUND' });
    }

    const periodStarts = AdminService.businessPeriodStarts();
    const selectedPeriod = AdminService.isBuyerAnalyticsPeriod(filters.period)
      ? filters.period
      : 'month';
    const selectedRange = AdminService.businessPeriodRange(selectedPeriod, filters.anchor);
    const [
      lifetime,
      currentDay,
      currentWeek,
      currentMonth,
      currentYear,
      selectedAggregate,
      statusGroups,
      latestOrder,
      recentOrders,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: { buyerId: id },
        _count: { _all: true },
        _sum: { totalPaise: true },
      }),
      this.orderPeriodAggregate(id, periodStarts.day),
      this.orderPeriodAggregate(id, periodStarts.week),
      this.orderPeriodAggregate(id, periodStarts.month),
      this.orderPeriodAggregate(id, periodStarts.year),
      this.orderPeriodAggregate(id, selectedRange.start, selectedRange.end),
      this.prisma.order.groupBy({
        by: ['status'],
        where: { buyerId: id },
        _count: { _all: true },
      }),
      this.prisma.order.findFirst({
        where: { buyerId: id },
        orderBy: { placedAt: 'desc' },
        select: { orderNumber: true, status: true, placedAt: true },
      }),
      this.prisma.order.findMany({
        where: { buyerId: id },
        orderBy: { placedAt: 'desc' },
        take: 100,
        include: { _count: { select: { items: true } } },
      }),
    ]);

    const summary = this.emptyBuyerOrderSummary();
    summary.totalOrders = lifetime._count._all;
    summary.totalPaise = Number(lifetime._sum.totalPaise ?? 0n);
    summary.averageOrderPaise =
      summary.totalOrders > 0 ? Math.round(summary.totalPaise / summary.totalOrders) : 0;
    summary.periodAnalytics.day = this.toBuyerPeriodSummary(currentDay);
    summary.periodAnalytics.week = this.toBuyerPeriodSummary(currentWeek);
    const currentMonthSummary = this.toBuyerPeriodSummary(currentMonth);
    summary.periodAnalytics.month = currentMonthSummary;
    summary.periodAnalytics.year = this.toBuyerPeriodSummary(currentYear);
    summary.periodAnalytics[selectedPeriod] = this.toBuyerPeriodSummary(selectedAggregate);
    summary.currentMonthOrders = currentMonthSummary.orderCount;
    summary.currentMonthPaise = currentMonthSummary.totalPaise;
    for (const row of statusGroups) {
      summary.statusCounts[row.status] = row._count._all;
    }
    if (latestOrder) {
      summary.latestOrderNumber = latestOrder.orderNumber;
      summary.latestOrderStatus = latestOrder.status;
      summary.latestOrderAt = latestOrder.placedAt.toISOString();
    }

    return {
      ...this.toBuyerRow(user, summary),
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        placedAt: order.placedAt.toISOString(),
        totalPaise: Number(order.totalPaise),
        itemCount: order._count.items,
        courierService: order.courierService,
        courierDocketNumber: order.courierDocketNumber,
      })),
    };
  }

  async createBuyer(
    input: AdminCreateBuyerInput,
    actorId: string,
  ): Promise<Awaited<ReturnType<AdminService['listBuyers']>>[number]> {
    const email = this.normalizeEmail(input.businessEmail);
    const requestedGstin = input.gstin?.trim().toUpperCase() ?? '';

    const [existingUser, existingProfile] = await Promise.all([
      this.prisma.user.findUnique({ where: { email } }),
      requestedGstin
        ? this.prisma.businessProfile.findUnique({ where: { gstin: requestedGstin } })
        : Promise.resolve(null),
    ]);

    if (existingUser) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'A user with this email already exists.',
      });
    }

    if (existingProfile) {
      throw new ConflictException({
        code: 'GSTIN_ALREADY_REGISTERED',
        message: 'A business with this GSTIN has already registered.',
      });
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const gstin = await this.resolveBuyerGstin(tx, requestedGstin);
      const created = await tx.user.create({
        data: {
          auth0Id: `pending|${email}`,
          email,
          fullName: this.normalizeUpper(input.ownerName),
          roles: ['BUYER'],
          accountStatus: input.accountStatus,
          businessProfile: {
            create: {
              businessName: this.normalizeUpper(input.businessName),
              businessType: input.businessType,
              gstin,
              pan: this.normalizeOptionalUpper(input.pan),
              drugLicenseNumber: this.normalizeUpper(input.drugLicenseNumber),
              pharmacyRegistrationNumber: this.normalizeOptionalUpper(
                input.pharmacyRegistrationNumber,
              ),
              mobile: input.mobile,
              businessEmail: email,
              addressLine1: this.normalizeUpper(input.address.line1),
              addressLine2: this.normalizeOptionalUpper(input.address.line2),
              city: this.normalizeUpper(input.address.city),
              state: input.address.state,
              pin: this.normalizeOptionalText(input.address.pin),
              country: input.address.country,
            },
          },
        },
        include: { businessProfile: true },
      });

      if (input.accountStatus === 'APPROVED') {
        await tx.kycApplication.create({
          data: {
            userId: created.id,
            status: 'APPROVED',
            reviewedAt: new Date(),
            reviewedById: actorId,
            reviewerNote: 'Created and approved by admin.',
          },
        });
      }

      return created;
    });

    return this.toBuyerRow(user);
  }

  async updateBuyer(
    id: string,
    input: AdminUpdateBuyerInput,
  ): Promise<Awaited<ReturnType<AdminService['listBuyers']>>[number]> {
    const current = await this.prisma.user.findFirst({
      where: { id, deletedAt: null, roles: { has: 'BUYER' } },
      include: { businessProfile: true },
    });

    if (!current || !current.businessProfile) {
      throw new NotFoundException({ code: 'BUYER_NOT_FOUND' });
    }

    const email =
      typeof input.businessEmail === 'string'
        ? this.normalizeEmail(input.businessEmail)
        : undefined;
    if (email && email !== current.email) {
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== id) {
        throw new ConflictException({
          code: 'EMAIL_ALREADY_REGISTERED',
          message: 'A user with this email already exists.',
        });
      }
    }

    const user = await this.prisma.$transaction(async (tx) => {
      let gstin: string | undefined;
      if (input.gstin !== undefined) {
        gstin = await this.resolveBuyerGstin(tx, input.gstin);
        if (gstin !== current.businessProfile?.gstin) {
          const existingProfile = await tx.businessProfile.findUnique({ where: { gstin } });
          if (existingProfile && existingProfile.userId !== id) {
            throw new ConflictException({
              code: 'GSTIN_ALREADY_REGISTERED',
              message: 'A business with this GSTIN has already registered.',
            });
          }
        }
      }

      return tx.user.update({
        where: { id },
        data: {
          email,
          fullName:
            typeof input.ownerName === 'string' ? this.normalizeUpper(input.ownerName) : undefined,
          accountStatus: input.accountStatus,
          businessProfile: {
            update: {
              businessName:
                typeof input.businessName === 'string'
                  ? this.normalizeUpper(input.businessName)
                  : undefined,
              businessType: input.businessType,
              gstin,
              pan: input.pan !== undefined ? this.normalizeOptionalUpper(input.pan) : undefined,
              drugLicenseNumber:
                typeof input.drugLicenseNumber === 'string'
                  ? this.normalizeUpper(input.drugLicenseNumber)
                  : undefined,
              pharmacyRegistrationNumber:
                input.pharmacyRegistrationNumber !== undefined
                  ? this.normalizeOptionalUpper(input.pharmacyRegistrationNumber)
                  : undefined,
              mobile: input.mobile,
              businessEmail: email,
              addressLine1:
                typeof input.address?.line1 === 'string'
                  ? this.normalizeUpper(input.address.line1)
                  : undefined,
              addressLine2:
                input.address?.line2 !== undefined
                  ? this.normalizeOptionalUpper(input.address.line2)
                  : undefined,
              city:
                typeof input.address?.city === 'string'
                  ? this.normalizeUpper(input.address.city)
                  : undefined,
              state: input.address?.state,
              pin:
                input.address?.pin !== undefined
                  ? this.normalizeOptionalText(input.address.pin)
                  : undefined,
              country: input.address?.country,
            },
          },
        },
        include: { businessProfile: true },
      });
    });

    return this.toBuyerRow(user);
  }

  async deleteBuyer(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const buyer = await tx.user.findFirst({
        where: { id, deletedAt: null, roles: { has: 'BUYER' } },
        select: { id: true },
      });
      if (!buyer) {
        throw new NotFoundException({ code: 'BUYER_NOT_FOUND' });
      }

      const orderCount = await tx.order.count({ where: { buyerId: id } });
      if (orderCount > 0) {
        throw new ConflictException({
          code: 'BUYER_HAS_ORDERS',
          message: 'Buyers with order history cannot be deleted.',
        });
      }

      await tx.kycApplication.deleteMany({ where: { userId: id } });
      await tx.businessProfile.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
    });
  }

  async listEmployees(): Promise<AdminEmployeeView[]> {
    const employees = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        OR: EMPLOYEE_ROLES.map((role) => ({ roles: { has: role } })),
      },
      orderBy: [{ accountStatus: 'asc' }, { createdAt: 'desc' }],
    });
    return employees.map((employee) => this.toEmployeeView(employee));
  }

  async createEmployee(
    input: AdminCreateEmployeeInput,
    _actorId: string,
  ): Promise<AdminEmployeeView> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing && !existing.deletedAt) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'A user with this email already exists.',
      });
    }
    if (existing?.deletedAt) {
      throw new ConflictException({
        code: 'SOFT_DELETED_USER_EXISTS',
        message: 'This email belongs to an archived user. Restore it manually before reusing it.',
      });
    }

    const employee = await this.prisma.user.create({
      data: {
        auth0Id: `pending|${email}`,
        email,
        fullName: input.fullName.trim(),
        roles: [input.role],
        accountStatus: input.accountStatus,
        suspendedAt: input.accountStatus === 'SUSPENDED' ? new Date() : null,
      },
    });
    return this.toEmployeeView(employee);
  }

  async updateEmployee(
    id: string,
    input: AdminUpdateEmployeeInput,
    actorId: string,
  ): Promise<AdminEmployeeView> {
    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: EMPLOYEE_ROLES.map((role) => ({ roles: { has: role } })),
      },
    });
    if (!existing) {
      throw new NotFoundException({ code: 'EMPLOYEE_NOT_FOUND' });
    }

    const nextRole = input.role ?? EMPLOYEE_ROLES.find((role) => existing.roles.includes(role));
    if (!nextRole) {
      throw new BadRequestException({ code: 'EMPLOYEE_ROLE_REQUIRED' });
    }
    const nextStatus = input.accountStatus ?? existing.accountStatus;
    if (id === actorId && (nextStatus === 'SUSPENDED' || nextRole !== 'SUPER_ADMIN')) {
      throw new BadRequestException({
        code: 'CANNOT_REMOVE_OWN_ACCESS',
        message: 'Use another super admin account to change your own access.',
      });
    }

    if (existing.roles.includes('SUPER_ADMIN') && nextRole !== 'SUPER_ADMIN') {
      const remainingSuperAdmins = await this.prisma.user.count({
        where: {
          id: { not: id },
          deletedAt: null,
          accountStatus: 'APPROVED',
          roles: { has: 'SUPER_ADMIN' },
        },
      });
      if (remainingSuperAdmins === 0) {
        throw new BadRequestException({
          code: 'LAST_SUPER_ADMIN',
          message: 'At least one approved super admin must remain.',
        });
      }
    }

    const employee = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: input.fullName?.trim(),
        roles: [nextRole],
        accountStatus: nextStatus,
        suspendedAt: nextStatus === 'SUSPENDED' ? (existing.suspendedAt ?? new Date()) : null,
        suspensionReason:
          nextStatus === 'SUSPENDED' ? (input.suspensionReason ?? existing.suspensionReason) : null,
      },
    });
    return this.toEmployeeView(employee);
  }

  async hrDashboard(): Promise<HrDashboardView> {
    const [records, documents, salarySlips, expenses, workLogs] = await Promise.all([
      this.prisma.employeeHrRecord.findMany({
        include: { employee: { select: { id: true, fullName: true, email: true } } },
        orderBy: [{ archivedAt: 'asc' }, { employeeCode: 'asc' }],
      }),
      this.prisma.employeeHrDocument.findMany({
        take: 50,
        orderBy: { generatedAt: 'desc' },
      }),
      this.prisma.employeeSalarySlip.findMany({
        take: 50,
        include: { employee: { select: { fullName: true } } },
        orderBy: [{ periodMonth: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.employeeExpense.findMany({
        take: 100,
        include: { employee: { select: { fullName: true } } },
        orderBy: [{ status: 'asc' }, { expenseDate: 'desc' }],
      }),
      this.prisma.employeeWorkLog.findMany({
        take: 100,
        include: { employee: { select: { fullName: true } } },
        orderBy: { workDate: 'desc' },
      }),
    ]);

    return {
      records: records.map((record) => this.toHrRecordView(record)),
      documents: documents.map((document) => this.toHrDocumentView(document)),
      salarySlips: salarySlips.map((salarySlip) => this.toHrSalarySlipView(salarySlip)),
      expenses: expenses.map((expense) => this.toHrExpenseView(expense)),
      workLogs: workLogs.map((workLog) => this.toHrWorkLogView(workLog)),
    };
  }

  async upsertHrRecord(input: UpsertHrEmployeeRecordInput): Promise<HrEmployeeRecordView> {
    const employee = await this.prisma.user.findFirst({
      where: {
        id: input.employeeId,
        deletedAt: null,
        OR: EMPLOYEE_ROLES.map((role) => ({ roles: { has: role } })),
      },
      select: { id: true, fullName: true, email: true },
    });
    if (!employee) {
      throw new NotFoundException({ code: 'EMPLOYEE_NOT_FOUND' });
    }

    const salary = splitSalary(input.grossMonthlyPaise);
    const record = await this.prisma.employeeHrRecord.upsert({
      where: { employeeId: input.employeeId },
      create: {
        employeeId: input.employeeId,
        employeeCode: input.employeeCode.trim().toUpperCase(),
        serialNumber: input.serialNumber ?? null,
        roleTitle: input.roleTitle.trim().toUpperCase(),
        address: input.address.trim().toUpperCase(),
        headQuarter: input.headQuarter.trim().toUpperCase(),
        joiningDate: parseDateOnly(input.joiningDate),
        offerDate: input.offerDate ? parseDateOnly(input.offerDate) : null,
        appointmentDate: input.appointmentDate ? parseDateOnly(input.appointmentDate) : null,
        mobileNumber: this.normalizeOptionalText(input.mobileNumber),
        mailId: input.mailId ? this.normalizeEmail(input.mailId) : null,
        gender: this.normalizeOptionalUpper(input.gender),
        department: this.normalizeOptionalUpper(input.department),
        region: this.normalizeOptionalUpper(input.region),
        bankDetails: this.normalizeOptionalUpper(input.bankDetails),
        bankAccountNumber: this.normalizeOptionalText(input.bankAccountNumber),
        bloodGroup: this.normalizeOptionalUpper(input.bloodGroup),
        dateOfBirth: input.dateOfBirth ? parseDateOnly(input.dateOfBirth) : null,
        marriageAnniversary: input.marriageAnniversary
          ? parseDateOnly(input.marriageAnniversary)
          : null,
        emergencyContactPerson: this.normalizeOptionalUpper(input.emergencyContactPerson),
        emergencyContactRelationship: this.normalizeOptionalUpper(
          input.emergencyContactRelationship,
        ),
        emergencyContactNumber: this.normalizeOptionalText(input.emergencyContactNumber),
        panNumber: this.normalizeOptionalUpper(input.panNumber),
        grossMonthlyPaise: input.grossMonthlyPaise,
        basicMonthlyPaise: salary.basicMonthlyPaise,
        hraMonthlyPaise: salary.hraMonthlyPaise,
        specialAllowanceMonthlyPaise: salary.specialAllowanceMonthlyPaise,
        dailyAllowancePaise: input.dailyAllowancePaise,
        petrolAllowancePaise: input.petrolAllowancePaise,
        mobileAllowancePaise: input.mobileAllowancePaise,
        deductionPaise: input.deductionPaise,
      },
      update: {
        employeeCode: input.employeeCode.trim().toUpperCase(),
        serialNumber: input.serialNumber ?? null,
        roleTitle: input.roleTitle.trim().toUpperCase(),
        address: input.address.trim().toUpperCase(),
        headQuarter: input.headQuarter.trim().toUpperCase(),
        joiningDate: parseDateOnly(input.joiningDate),
        offerDate: input.offerDate ? parseDateOnly(input.offerDate) : null,
        appointmentDate: input.appointmentDate ? parseDateOnly(input.appointmentDate) : null,
        mobileNumber: this.normalizeOptionalText(input.mobileNumber),
        mailId: input.mailId ? this.normalizeEmail(input.mailId) : null,
        gender: this.normalizeOptionalUpper(input.gender),
        department: this.normalizeOptionalUpper(input.department),
        region: this.normalizeOptionalUpper(input.region),
        bankDetails: this.normalizeOptionalUpper(input.bankDetails),
        bankAccountNumber: this.normalizeOptionalText(input.bankAccountNumber),
        bloodGroup: this.normalizeOptionalUpper(input.bloodGroup),
        dateOfBirth: input.dateOfBirth ? parseDateOnly(input.dateOfBirth) : null,
        marriageAnniversary: input.marriageAnniversary
          ? parseDateOnly(input.marriageAnniversary)
          : null,
        emergencyContactPerson: this.normalizeOptionalUpper(input.emergencyContactPerson),
        emergencyContactRelationship: this.normalizeOptionalUpper(
          input.emergencyContactRelationship,
        ),
        emergencyContactNumber: this.normalizeOptionalText(input.emergencyContactNumber),
        panNumber: this.normalizeOptionalUpper(input.panNumber),
        grossMonthlyPaise: input.grossMonthlyPaise,
        basicMonthlyPaise: salary.basicMonthlyPaise,
        hraMonthlyPaise: salary.hraMonthlyPaise,
        specialAllowanceMonthlyPaise: salary.specialAllowanceMonthlyPaise,
        dailyAllowancePaise: input.dailyAllowancePaise,
        petrolAllowancePaise: input.petrolAllowancePaise,
        mobileAllowancePaise: input.mobileAllowancePaise,
        deductionPaise: input.deductionPaise,
        archivedAt: null,
        archiveReason: null,
      },
      include: { employee: { select: { id: true, fullName: true, email: true } } },
    });

    return this.toHrRecordView(record);
  }

  async archiveHrRecord(
    employeeId: string,
    input: ArchiveHrEmployeeInput,
  ): Promise<HrEmployeeRecordView> {
    const record = await this.prisma.employeeHrRecord.update({
      where: { employeeId },
      data: {
        archivedAt: new Date(),
        archiveReason: input.archiveReason?.trim() ?? null,
      },
      include: { employee: { select: { id: true, fullName: true, email: true } } },
    });
    return this.toHrRecordView(record);
  }

  async createHrExpense(input: CreateHrExpenseInput): Promise<HrExpenseView> {
    const expense = await this.prisma.employeeExpense.create({
      data: {
        employeeId: input.employeeId,
        expenseDate: parseDateOnly(input.expenseDate),
        type: input.type,
        amountPaise: input.amountPaise,
        description: input.description?.trim() ?? null,
        billKey: input.billKey?.trim() ?? null,
        billContentType: input.billContentType?.trim() ?? null,
      },
      include: { employee: { select: { fullName: true } } },
    });
    return this.toHrExpenseView(expense);
  }

  async reviewHrExpense(
    id: string,
    actorId: string,
    input: ReviewHrExpenseInput,
  ): Promise<HrExpenseView> {
    const expense = await this.prisma.employeeExpense.update({
      where: { id },
      data: {
        status: input.status,
        reviewedById: actorId,
        reviewedAt: new Date(),
        reviewerNote: input.reviewerNote?.trim() ?? null,
      },
      include: { employee: { select: { fullName: true } } },
    });
    return this.toHrExpenseView(expense);
  }

  async upsertHrWorkLog(input: UpsertHrWorkLogInput): Promise<HrWorkLogView> {
    const workDate = parseDateOnly(input.workDate);
    const workLog = await this.prisma.employeeWorkLog.upsert({
      where: { employeeId_workDate: { employeeId: input.employeeId, workDate } },
      create: {
        employeeId: input.employeeId,
        workDate,
        worked: input.worked,
        note: input.note?.trim() ?? null,
      },
      update: {
        worked: input.worked,
        note: input.note?.trim() ?? null,
      },
      include: { employee: { select: { fullName: true } } },
    });
    return this.toHrWorkLogView(workLog);
  }

  async generateHrDocument(
    employeeId: string,
    actorId: string,
    input: GenerateHrDocumentInput,
  ): Promise<GenerateHrDocumentResponse> {
    const record = await this.getHrRecordOrThrow(employeeId);
    const referenceNumber = await this.nextHrReference(input.type, new Date());
    const title = input.type === 'OFFER_LETTER' ? 'OFFER LETTER' : 'APPOINTMENT LETTER';
    const fileName = `${referenceNumber.replace(/[/-]/g, '_')}.pdf`;
    const lines =
      input.type === 'OFFER_LETTER'
        ? this.offerLetterLines(record)
        : this.appointmentLetterLines(record, referenceNumber);
    const bytes = await this.renderHrPdf(title, lines);

    const document = await this.prisma.employeeHrDocument.create({
      data: {
        employeeId,
        generatedById: actorId,
        type: input.type,
        referenceNumber,
        fileName,
        payload: {
          employeeName: record.employee.fullName,
          employeeCode: record.employeeCode,
          roleTitle: record.roleTitle,
          generatedOn: formatDateOnly(new Date()),
        },
      },
    });

    return {
      document: this.toHrDocumentView(document),
      fileName,
      contentType: 'application/pdf',
      contentBase64: Buffer.from(bytes).toString('base64'),
    };
  }

  async generateHrSalarySlip(
    actorId: string,
    input: GenerateHrSalarySlipInput,
  ): Promise<GenerateHrSalarySlipResponse> {
    const record = await this.getHrRecordOrThrow(input.employeeId);
    const { start, end, daysInMonth } = monthBounds(input.periodMonth);
    const approvedLeaveDays = await this.prisma.employeeLeaveRequest.aggregate({
      where: {
        employeeId: input.employeeId,
        status: 'APPROVED',
        startDate: { lte: end },
        endDate: { gte: start },
      },
      _sum: { dayCount: true },
    });
    const loggedWorkDays = await this.prisma.employeeWorkLog.count({
      where: {
        employeeId: input.employeeId,
        worked: true,
        workDate: { gte: start, lte: end },
      },
    });
    const leaveDays = approvedLeaveDays._sum.dayCount ?? 0;
    const workingDays =
      input.workingDays ??
      (loggedWorkDays > 0 ? loggedWorkDays : Math.max(0, daysInMonth - leaveDays));
    const approvedExpenses = await this.prisma.employeeExpense.aggregate({
      where: {
        employeeId: input.employeeId,
        status: 'APPROVED',
        expenseDate: { gte: start, lte: end },
      },
      _sum: { amountPaise: true },
    });
    const approvedExpensePaise = Number(approvedExpenses._sum.amountPaise ?? 0);
    const dailyAllowancePaise = toNumber(record.dailyAllowancePaise) * workingDays;
    const grossPaise = toNumber(record.grossMonthlyPaise);
    const netPayPaise =
      grossPaise +
      dailyAllowancePaise +
      toNumber(record.petrolAllowancePaise) +
      toNumber(record.mobileAllowancePaise) +
      approvedExpensePaise +
      input.bonusPaise -
      toNumber(record.deductionPaise);

    const salarySlip = await this.prisma.employeeSalarySlip.upsert({
      where: { employeeId_periodMonth: { employeeId: input.employeeId, periodMonth: start } },
      create: {
        employeeId: input.employeeId,
        generatedById: actorId,
        periodMonth: start,
        workingDays,
        leaveDays,
        basicPaise: record.basicMonthlyPaise,
        hraPaise: record.hraMonthlyPaise,
        specialAllowancePaise: record.specialAllowanceMonthlyPaise,
        grossPaise: record.grossMonthlyPaise,
        dailyAllowancePaise,
        petrolAllowancePaise: record.petrolAllowancePaise,
        mobileAllowancePaise: record.mobileAllowancePaise,
        approvedExpensePaise,
        bonusPaise: input.bonusPaise,
        deductionPaise: record.deductionPaise,
        netPayPaise,
        transactionDate: input.transactionDate ? parseDateOnly(input.transactionDate) : null,
        transactionReference: input.transactionReference?.trim() ?? null,
        notes: input.notes?.trim() ?? null,
      },
      update: {
        generatedById: actorId,
        workingDays,
        leaveDays,
        dailyAllowancePaise,
        approvedExpensePaise,
        bonusPaise: input.bonusPaise,
        netPayPaise,
        transactionDate: input.transactionDate ? parseDateOnly(input.transactionDate) : null,
        transactionReference: input.transactionReference?.trim() ?? null,
        notes: input.notes?.trim() ?? null,
      },
      include: { employee: { select: { fullName: true } } },
    });

    const referenceNumber = await this.nextHrReference('SALARY_SLIP', start);
    const fileName = `${referenceNumber.replace(/[/-]/g, '_')}.pdf`;
    const slipView = this.toHrSalarySlipView(salarySlip);
    const bytes = await this.renderHrPdf(
      'SALARY SLIP',
      this.salarySlipLines(record, slipView, input.periodMonth),
    );
    await this.prisma.employeeHrDocument.create({
      data: {
        employeeId: input.employeeId,
        generatedById: actorId,
        type: 'SALARY_SLIP',
        referenceNumber,
        fileName,
        payload: {
          periodMonth: input.periodMonth,
          salarySlipId: salarySlip.id,
          employeeName: record.employee.fullName,
        },
      },
    });

    return {
      salarySlip: slipView,
      fileName,
      contentType: 'application/pdf',
      contentBase64: Buffer.from(bytes).toString('base64'),
    };
  }

  async leaveDashboard(actorId: string, actorRoles: string[]): Promise<EmployeeLeaveDashboardView> {
    const canReview = actorRoles.includes('SUPER_ADMIN');
    const year = new Date().getUTCFullYear();
    const requests = await this.prisma.employeeLeaveRequest.findMany({
      where: canReview ? {} : { employeeId: actorId },
      include: {
        employee: { select: { id: true, fullName: true, email: true } },
        reviewedBy: { select: { id: true, fullName: true } },
      },
      orderBy: [{ status: 'asc' }, { startDate: 'asc' }, { createdAt: 'desc' }],
    });

    return {
      currentUserId: actorId,
      canReview,
      balance: await this.leaveBalance(actorId, year),
      requests: requests.map((request) => this.toLeaveRequestView(request)),
    };
  }

  async createLeaveRequest(
    actorId: string,
    actorRoles: string[],
    input: CreateLeaveRequestInput,
  ): Promise<EmployeeLeaveRequestView> {
    this.assertEmployeeRole(actorRoles);

    const startDate = parseDateOnly(input.startDate);
    const endDate = parseDateOnly(input.endDate);
    const year = startDate.getUTCFullYear();
    if (endDate.getUTCFullYear() !== year) {
      throw new BadRequestException({
        code: 'LEAVE_SINGLE_YEAR_REQUIRED',
        message: 'Leave requests must stay within one calendar year.',
      });
    }

    const dayCount = inclusiveDayCount(startDate, endDate);
    if (dayCount <= 0) {
      throw new BadRequestException({ code: 'LEAVE_DATE_RANGE_INVALID' });
    }

    const balance = await this.leaveBalance(actorId, year);
    if (dayCount > balance.remainingDays) {
      throw new BadRequestException({
        code: 'LEAVE_BALANCE_EXCEEDED',
        message: `Only ${balance.remainingDays} PTO day(s) are available for ${year}.`,
      });
    }

    const overlapping = await this.prisma.employeeLeaveRequest.count({
      where: {
        employeeId: actorId,
        status: { in: ['PENDING', 'APPROVED'] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    if (overlapping > 0) {
      throw new ConflictException({
        code: 'LEAVE_REQUEST_OVERLAPS',
        message: 'This leave overlaps an existing pending or approved request.',
      });
    }

    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.employeeLeaveRequest.create({
        data: {
          employeeId: actorId,
          startDate,
          endDate,
          dayCount,
          reason: input.reason?.trim() ?? null,
        },
        include: {
          employee: { select: { id: true, fullName: true, email: true } },
          reviewedBy: { select: { id: true, fullName: true } },
        },
      });

      await tx.notificationLog.create({
        data: {
          channel: 'EMAIL',
          kind: 'leave.request.created',
          recipient: 'SUPER_ADMIN',
          status: 'PENDING',
          metadata: {
            leaveRequestId: created.id,
            employeeId: actorId,
            employeeName: created.employee.fullName,
            startDate: input.startDate,
            endDate: input.endDate,
            dayCount,
          },
        },
      });

      return created;
    });

    void this.dispatchLeaveRequestCreatedEmail(request).catch(() => undefined);

    return this.toLeaveRequestView(request);
  }

  async reviewLeaveRequest(
    id: string,
    actorId: string,
    input: ReviewLeaveRequestInput,
  ): Promise<EmployeeLeaveRequestView> {
    const now = new Date();
    const existing = await this.prisma.employeeLeaveRequest.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, fullName: true, email: true } },
        reviewedBy: { select: { id: true, fullName: true } },
      },
    });
    if (!existing) {
      throw new NotFoundException({ code: 'LEAVE_REQUEST_NOT_FOUND' });
    }
    if (existing.status !== 'PENDING') {
      throw new BadRequestException({
        code: 'LEAVE_REQUEST_ALREADY_REVIEWED',
        message: 'Only pending leave requests can be approved or rejected.',
      });
    }

    if (input.status === 'APPROVED') {
      const balance = await this.leaveBalance(
        existing.employeeId,
        existing.startDate.getUTCFullYear(),
      );
      if (existing.dayCount > balance.entitlementDays - balance.approvedDays) {
        throw new BadRequestException({
          code: 'LEAVE_BALANCE_EXCEEDED',
          message: `Only ${balance.remainingDays} PTO day(s) are available.`,
        });
      }
    }

    const request = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.employeeLeaveRequest.update({
        where: { id },
        data: {
          status: input.status,
          reviewedById: actorId,
          reviewedAt: now,
          reviewerNote: input.reviewerNote?.trim() ?? null,
        },
        include: {
          employee: { select: { id: true, fullName: true, email: true } },
          reviewedBy: { select: { id: true, fullName: true } },
        },
      });

      await tx.notificationLog.create({
        data: {
          channel: 'EMAIL',
          kind: input.status === 'APPROVED' ? 'leave.request.approved' : 'leave.request.rejected',
          recipient: updated.employee.email,
          status: 'PENDING',
          metadata: {
            leaveRequestId: updated.id,
            employeeId: updated.employeeId,
            employeeName: updated.employee.fullName,
            status: input.status,
            startDate: formatDateOnly(updated.startDate),
            endDate: formatDateOnly(updated.endDate),
            dayCount: updated.dayCount,
          },
        },
      });

      return updated;
    });

    void this.dispatchLeaveRequestReviewedEmail(request).catch(() => undefined);

    return this.toLeaveRequestView(request);
  }

  private async dispatchLeaveRequestCreatedEmail(request: {
    id: string;
    employeeId: string;
    employee: { fullName: string; email: string };
    startDate: Date;
    endDate: Date;
    dayCount: number;
    reason: string | null;
  }): Promise<void> {
    if (this.config.get<boolean>('features.emailNotificationsEnabled') !== true) {
      return;
    }

    const recipients = await this.getSuperAdminEmails();
    await this.jobs.enqueueEmail({
      kind: 'LEAVE_REQUEST_CREATED',
      to: recipients,
      data: {
        employeeName: request.employee.fullName,
        startDate: formatDateOnly(request.startDate),
        endDate: formatDateOnly(request.endDate),
        dayCount: request.dayCount,
        reason: request.reason ?? undefined,
        adminUrl: `${process.env.WEB_BASE_URL ?? 'http://localhost:3000'}/admin/holidays`,
      },
    });
  }

  private async dispatchLeaveRequestReviewedEmail(request: {
    employee: { fullName: string; email: string };
    startDate: Date;
    endDate: Date;
    dayCount: number;
    status: string;
    reviewerNote: string | null;
  }): Promise<void> {
    if (this.config.get<boolean>('features.emailNotificationsEnabled') !== true) {
      return;
    }
    if (request.status !== 'APPROVED' && request.status !== 'REJECTED') {
      return;
    }

    await this.jobs.enqueueEmail({
      kind: request.status === 'APPROVED' ? 'LEAVE_REQUEST_APPROVED' : 'LEAVE_REQUEST_REJECTED',
      to: request.employee.email,
      data: {
        employeeName: request.employee.fullName,
        startDate: formatDateOnly(request.startDate),
        endDate: formatDateOnly(request.endDate),
        dayCount: request.dayCount,
        status: request.status,
        reviewerNote: request.reviewerNote ?? undefined,
      },
    });
  }

  private async getSuperAdminEmails(): Promise<string | string[]> {
    const configured =
      process.env.LEAVE_NOTIFICATION_EMAIL?.trim() ??
      process.env.SUPER_ADMIN_NOTIFICATION_EMAIL?.trim();
    if (configured) {
      return configured;
    }

    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        accountStatus: 'APPROVED',
        roles: { has: 'SUPER_ADMIN' },
      },
      select: { email: true },
    });
    const emails = Array.from(new Set(users.map((user) => user.email).filter(Boolean)));
    if (emails.length > 0) {
      return emails;
    }
    return process.env.ADMIN_NOTIFICATION_EMAIL ?? 'admin@parshlo.local';
  }

  private assertEmployeeRole(roles: string[]): void {
    if (!roles.some((role) => EMPLOYEE_ROLES.includes(role as EmployeeRole))) {
      throw new BadRequestException({ code: 'EMPLOYEE_ROLE_REQUIRED' });
    }
  }

  private async leaveBalance(employeeId: string, year: number): Promise<EmployeeLeaveBalanceView> {
    const bounds = yearBounds(year);
    const requests = await this.prisma.employeeLeaveRequest.findMany({
      where: {
        employeeId,
        startDate: { gte: bounds.start },
        endDate: { lte: bounds.end },
        status: { in: ['PENDING', 'APPROVED'] },
      },
      select: { status: true, dayCount: true },
    });

    const approvedDays = requests
      .filter((request) => request.status === 'APPROVED')
      .reduce((total, request) => total + request.dayCount, 0);
    const pendingDays = requests
      .filter((request) => request.status === 'PENDING')
      .reduce((total, request) => total + request.dayCount, 0);

    return {
      employeeId,
      year,
      entitlementDays: EMPLOYEE_LEAVE_ENTITLEMENT_DAYS,
      approvedDays,
      pendingDays,
      remainingDays: Math.max(0, EMPLOYEE_LEAVE_ENTITLEMENT_DAYS - approvedDays - pendingDays),
    };
  }

  private toLeaveRequestView(request: {
    id: string;
    employeeId: string;
    employee: { fullName: string; email: string };
    startDate: Date;
    endDate: Date;
    dayCount: number;
    reason: string | null;
    status: string;
    reviewedById: string | null;
    reviewedBy: { fullName: string } | null;
    reviewedAt: Date | null;
    reviewerNote: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): EmployeeLeaveRequestView {
    return {
      id: request.id,
      employeeId: request.employeeId,
      employeeName: request.employee.fullName,
      employeeEmail: request.employee.email,
      startDate: formatDateOnly(request.startDate),
      endDate: formatDateOnly(request.endDate),
      dayCount: request.dayCount,
      reason: request.reason,
      status: request.status as EmployeeLeaveRequestView['status'],
      reviewedById: request.reviewedById,
      reviewedByName: request.reviewedBy?.fullName ?? null,
      reviewedAt: request.reviewedAt?.toISOString() ?? null,
      reviewerNote: request.reviewerNote,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    };
  }

  private async getHrRecordOrThrow(employeeId: string) {
    const record = await this.prisma.employeeHrRecord.findUnique({
      where: { employeeId },
      include: { employee: { select: { id: true, fullName: true, email: true } } },
    });
    if (!record) {
      throw new NotFoundException({
        code: 'HR_RECORD_NOT_FOUND',
        message: 'Create the employee HR record before generating HR documents.',
      });
    }
    return record;
  }

  private async nextHrReference(type: string, value: Date): Promise<string> {
    const fiscalYear = fiscalYearLabel(value);
    const prefix = `PSH/HR/${type.replace(/_/g, '-')}/${fiscalYear}/`;
    const count = await this.prisma.employeeHrDocument.count({
      where: { referenceNumber: { startsWith: prefix } },
    });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  private toHrRecordView(record: {
    id: string;
    employeeId: string;
    employee: { fullName: string; email: string };
    employeeCode: string;
    serialNumber: number | null;
    roleTitle: string;
    address: string;
    headQuarter: string;
    joiningDate: Date;
    offerDate: Date | null;
    appointmentDate: Date | null;
    mobileNumber: string | null;
    mailId: string | null;
    gender: string | null;
    department: string | null;
    region: string | null;
    bankDetails: string | null;
    bankAccountNumber: string | null;
    bloodGroup: string | null;
    dateOfBirth: Date | null;
    marriageAnniversary: Date | null;
    emergencyContactPerson: string | null;
    emergencyContactRelationship: string | null;
    emergencyContactNumber: string | null;
    panNumber: string | null;
    grossMonthlyPaise: bigint;
    basicMonthlyPaise: bigint;
    hraMonthlyPaise: bigint;
    specialAllowanceMonthlyPaise: bigint;
    dailyAllowancePaise: bigint;
    petrolAllowancePaise: bigint;
    mobileAllowancePaise: bigint;
    deductionPaise: bigint;
    archivedAt: Date | null;
    archiveReason: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): HrEmployeeRecordView {
    return {
      id: record.id,
      employeeId: record.employeeId,
      employeeName: record.employee.fullName,
      employeeEmail: record.employee.email,
      employeeCode: record.employeeCode,
      serialNumber: record.serialNumber,
      roleTitle: record.roleTitle,
      address: record.address,
      headQuarter: record.headQuarter,
      joiningDate: formatDateOnly(record.joiningDate),
      offerDate: record.offerDate ? formatDateOnly(record.offerDate) : null,
      appointmentDate: record.appointmentDate ? formatDateOnly(record.appointmentDate) : null,
      mobileNumber: record.mobileNumber,
      mailId: record.mailId,
      gender: record.gender,
      department: record.department,
      region: record.region,
      bankDetails: record.bankDetails,
      bankAccountNumber: record.bankAccountNumber,
      bloodGroup: record.bloodGroup,
      dateOfBirth: record.dateOfBirth ? formatDateOnly(record.dateOfBirth) : null,
      marriageAnniversary: record.marriageAnniversary
        ? formatDateOnly(record.marriageAnniversary)
        : null,
      emergencyContactPerson: record.emergencyContactPerson,
      emergencyContactRelationship: record.emergencyContactRelationship,
      emergencyContactNumber: record.emergencyContactNumber,
      panNumber: record.panNumber,
      grossMonthlyPaise: toNumber(record.grossMonthlyPaise),
      basicMonthlyPaise: toNumber(record.basicMonthlyPaise),
      hraMonthlyPaise: toNumber(record.hraMonthlyPaise),
      specialAllowanceMonthlyPaise: toNumber(record.specialAllowanceMonthlyPaise),
      dailyAllowancePaise: toNumber(record.dailyAllowancePaise),
      petrolAllowancePaise: toNumber(record.petrolAllowancePaise),
      mobileAllowancePaise: toNumber(record.mobileAllowancePaise),
      deductionPaise: toNumber(record.deductionPaise),
      archivedAt: record.archivedAt?.toISOString() ?? null,
      archiveReason: record.archiveReason,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private toHrDocumentView(document: {
    id: string;
    employeeId: string;
    type: string;
    referenceNumber: string;
    fileName: string;
    generatedAt: Date;
  }): HrDocumentView {
    return {
      id: document.id,
      employeeId: document.employeeId,
      type: document.type as HrDocumentView['type'],
      referenceNumber: document.referenceNumber,
      fileName: document.fileName,
      generatedAt: document.generatedAt.toISOString(),
    };
  }

  private toHrExpenseView(expense: {
    id: string;
    employeeId: string;
    employee: { fullName: string };
    expenseDate: Date;
    type: string;
    amountPaise: bigint;
    description: string | null;
    billKey: string | null;
    billContentType: string | null;
    status: string;
    reviewerNote: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): HrExpenseView {
    return {
      id: expense.id,
      employeeId: expense.employeeId,
      employeeName: expense.employee.fullName,
      expenseDate: formatDateOnly(expense.expenseDate),
      type: expense.type as HrExpenseView['type'],
      amountPaise: toNumber(expense.amountPaise),
      description: expense.description,
      billKey: expense.billKey,
      billContentType: expense.billContentType,
      status: expense.status as HrExpenseView['status'],
      reviewerNote: expense.reviewerNote,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }

  private toHrWorkLogView(workLog: {
    id: string;
    employeeId: string;
    employee: { fullName: string };
    workDate: Date;
    worked: boolean;
    note: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): HrWorkLogView {
    return {
      id: workLog.id,
      employeeId: workLog.employeeId,
      employeeName: workLog.employee.fullName,
      workDate: formatDateOnly(workLog.workDate),
      worked: workLog.worked,
      note: workLog.note,
      createdAt: workLog.createdAt.toISOString(),
      updatedAt: workLog.updatedAt.toISOString(),
    };
  }

  private toHrSalarySlipView(slip: {
    id: string;
    employeeId: string;
    employee: { fullName: string };
    periodMonth: Date;
    workingDays: number;
    leaveDays: number;
    basicPaise: bigint;
    hraPaise: bigint;
    specialAllowancePaise: bigint;
    grossPaise: bigint;
    dailyAllowancePaise: bigint;
    petrolAllowancePaise: bigint;
    mobileAllowancePaise: bigint;
    approvedExpensePaise: bigint;
    bonusPaise: bigint;
    deductionPaise: bigint;
    netPayPaise: bigint;
    transactionDate: Date | null;
    transactionReference: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): HrSalarySlipView {
    return {
      id: slip.id,
      employeeId: slip.employeeId,
      employeeName: slip.employee.fullName,
      periodMonth: formatDateOnly(slip.periodMonth),
      workingDays: slip.workingDays,
      leaveDays: slip.leaveDays,
      basicPaise: toNumber(slip.basicPaise),
      hraPaise: toNumber(slip.hraPaise),
      specialAllowancePaise: toNumber(slip.specialAllowancePaise),
      grossPaise: toNumber(slip.grossPaise),
      dailyAllowancePaise: toNumber(slip.dailyAllowancePaise),
      petrolAllowancePaise: toNumber(slip.petrolAllowancePaise),
      mobileAllowancePaise: toNumber(slip.mobileAllowancePaise),
      approvedExpensePaise: toNumber(slip.approvedExpensePaise),
      bonusPaise: toNumber(slip.bonusPaise),
      deductionPaise: toNumber(slip.deductionPaise),
      netPayPaise: toNumber(slip.netPayPaise),
      transactionDate: slip.transactionDate ? formatDateOnly(slip.transactionDate) : null,
      transactionReference: slip.transactionReference,
      notes: slip.notes,
      createdAt: slip.createdAt.toISOString(),
      updatedAt: slip.updatedAt.toISOString(),
    };
  }

  private offerLetterLines(
    record: Awaited<ReturnType<AdminService['getHrRecordOrThrow']>>,
  ): string[] {
    const annualGross = toNumber(record.grossMonthlyPaise) * 12;
    return [
      `Date: ${formatDateOnly(record.offerDate ?? new Date())}`,
      'Place: Pune, MH, INDIA',
      '',
      `Mr/Mrs/Ms. ${record.employee.fullName}`,
      record.address,
      '',
      `${record.employee.fullName},`,
      '',
      `With reference to your interview with Mr. Hemant Botre (CRM HEAD), we are happy to OFFER you the position of ${record.roleTitle} in our company w.e.f ${formatDateOnly(record.joiningDate)} or any other mutually acceptable date.`,
      '',
      `During the period, you will be paid a consolidated sum of ${formatInr(annualGross)} p.a. as a basic salary subject to tax deduction.`,
      '',
      'As per company rules you are not permitted to take up any other assignment, part time or casual, with any other company or agency. All normal working hours and relevant service rules will apply.',
      '',
      'The company will not make a full and final settlement if you resign during the probation period of 6 months and the company will deduct one month basic salary if you resign without serving a notice period of 1 month.',
      '',
      'Kindly confirm your acceptance by signing copy of this letter. We welcome you on board and wish you a long successful career with PARSHLO.',
      '',
      'Best Wishes.',
      'For PARSHLO',
      '',
      '',
      '(Authority Stamp)',
    ];
  }

  private appointmentLetterLines(
    record: Awaited<ReturnType<AdminService['getHrRecordOrThrow']>>,
    referenceNumber: string,
  ): string[] {
    return [
      `Ref No: ${referenceNumber}`,
      `Date: ${formatDateOnly(record.appointmentDate ?? new Date())}`,
      '',
      record.employee.fullName,
      record.address,
      '',
      `${record.employee.fullName},`,
      '',
      'Ref: Letter of Appointment.',
      '',
      `With reference to your application and subsequent interview you had with us, we are pleased to appoint you as ${record.roleTitle} in our organization with Head Quarter at ${record.headQuarter} w.e.f ${formatDateOnly(record.joiningDate)}.`,
      '',
      'For undertaking the above assignment, you will be paid salary and allowance as mentioned below:',
      `BASIC: ${formatInr(toNumber(record.basicMonthlyPaise))} Per Month`,
      `H.R.A.: ${formatInr(toNumber(record.hraMonthlyPaise))} Per Month`,
      `SPECIAL PAYEE ALLOWANCE: ${formatInr(toNumber(record.specialAllowanceMonthlyPaise))} Per Month`,
      `TOTAL: ${formatInr(toNumber(record.grossMonthlyPaise))} Per Month`,
      '',
      'ALLOWANCES FOR FIELD WORK:',
      `Head Quarter: ${formatInr(toNumber(record.dailyAllowancePaise))} per working day.`,
      'While at H.Q. you will not be entitled to charge any allowance on Sunday and Holiday.',
      `PETROL: ${formatInr(toNumber(record.petrolAllowancePaise))}`,
      `MOBILE: ${formatInr(toNumber(record.mobileAllowancePaise))}`,
      '',
      'You will be on probation for 6 months from the date of joining duty. Confirmation will be subject to sales performance, work input, daily doctor calls, chemist calls, reporting, and overall conduct.',
      '',
      'Your service is liable to be transferred to any section, department, unit, branch, or affiliated subsidiary anywhere in India. You must follow KEY RESULT AREA, WORK NORMS, REPORTING SYSTEMS, and GUIDELINES issued by the Company.',
      '',
      'Your salary and package are strictly confidential. The Company reserves the right to terminate employment for indiscipline, misconduct, insubordination, dishonesty, absenteeism, negligence of duty, misuse of company belongings, or breach of service conditions.',
      '',
      'LEAVE - You will be entitled for leave and other benefits as per the rules of the Company.',
      '',
      'Thanking you,',
      'Yours sincerely,',
      'PARSHLO',
      '',
      '',
      '(Authority Signatory)',
    ];
  }

  private salarySlipLines(
    record: Awaited<ReturnType<AdminService['getHrRecordOrThrow']>>,
    slip: HrSalarySlipView,
    periodMonth: string,
  ): string[] {
    const monthYear = new Intl.DateTimeFormat('en-IN', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${periodMonth}-01T00:00:00.000Z`));
    const totalEarnings = slip.basicPaise + slip.hraPaise + slip.specialAllowancePaise;
    return [
      'PRISURE MEDICARE',
      `SALARY SLIP FOR THE MONTH OF ${monthYear}`,
      '',
      `EMPLOYEE NAME : ${record.employee.fullName}`,
      `EMPLOYEE NO. : ${record.employeeCode}`,
      `DESIGNATION : ${record.roleTitle}`,
      `DEPARTMENT : ${record.department ?? '-'}`,
      `GENDER : ${record.gender ?? '-'}`,
      `REGION : ${record.region ?? record.headQuarter}`,
      `PAN NO. : ${record.panNumber ?? '-'}`,
      `PAID DAYS : ${slip.workingDays}`,
      `BANK DETAILS : ${record.bankDetails ?? '-'}`,
      `BANK A/C NO. : ${record.bankAccountNumber ?? '-'}`,
      '',
      'EARNINGS                          Payroll',
      `BASIC                             ${formatInr(slip.basicPaise)}`,
      `HRA                               ${formatInr(slip.hraPaise)}`,
      `SPECIAL ALLOWANCE                 ${formatInr(slip.specialAllowancePaise)}`,
      '',
      'DEDUCTION                         Payroll',
      `MH - PROF. TAX                    ${formatInr(slip.deductionPaise)}`,
      'INCOME TAX (TDS)',
      'LOAN',
      'ADVANCE',
      '',
      `Total Earnings : ${formatInr(totalEarnings)}`,
      `Total Deduction : ${formatInr(slip.deductionPaise)}`,
      `Total Payable : ${formatInr(slip.netPayPaise)}`,
      '',
      `NEFT/ DD/ CHQ DATE : ${slip.transactionDate ?? '-'}`,
      `NEFT/ DD/ CHQ NO. : ${slip.transactionReference ?? '-'}`,
      `AMOUNT : ${formatInr(slip.netPayPaise)}`,
      '',
      `Remarks : ${slip.notes ?? '-'}`,
      '',
      'Since this is computer generated slip no need of signature.',
      '',
      '- - - - - - - - - - - - - - - - - - Cut Here - - - - - - - - - - - - - - - - - -',
      'Kindly cut here and send HO',
      `I have received salary for the month of ${monthYear}`,
      `NEFT/ DD/ CHQ DATE : ${slip.transactionDate ?? '-'}`,
      `NEFT/ DD/ CHQ NO. : ${slip.transactionReference ?? '-'}`,
      `AMOUNT : ${formatInr(slip.netPayPaise)}`,
      '',
      `Name : ${record.employee.fullName}`,
      'Division : PARSHLO',
      `Region : ${record.region ?? record.headQuarter}`,
    ];
  }

  private async renderHrPdf(title: string, lines: string[]): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let page = pdf.addPage([595, 842]);
    let y = 790;
    page.drawText('PARSHLO', { x: 48, y, size: 16, font: bold, color: rgb(0.05, 0.28, 0.2) });
    y -= 34;
    page.drawText(title, { x: 48, y, size: 14, font: bold, color: rgb(0.05, 0.07, 0.09) });
    y -= 28;

    for (const line of lines) {
      if (y < 60) {
        page = pdf.addPage([595, 842]);
        y = 790;
      }
      const chunks = line.match(/.{1,92}(\s|$)/g) ?? [''];
      for (const chunk of chunks) {
        page.drawText(chunk.trimEnd(), {
          x: 48,
          y,
          size: 10,
          font,
          color: rgb(0.08, 0.1, 0.12),
        });
        y -= 15;
      }
      if (line === '') y -= 4;
    }

    return pdf.save();
  }

  async listPendingKyc(): Promise<
    {
      id: string;
      userId: string;
      status: string;
      submittedAt: string;
      ownerName: string;
      accountEmail: string;
      businessName: string;
      businessEmail: string;
      businessType: string | null;
      gstin: string | null;
      pan: string | null;
      drugLicenseNumber: string | null;
      pharmacyRegistrationNumber: string | null;
      mobile: string | null;
      address: {
        line1: string;
        line2: string | null;
        city: string;
        state: string;
        pin: string | null;
      } | null;
    }[]
  > {
    const apps = await this.prisma.kycApplication.findMany({
      where: { status: { in: ['PENDING_VERIFICATION', 'UNDER_REVIEW'] } },
      include: { user: { include: { businessProfile: true } } },
      orderBy: { submittedAt: 'asc' },
      take: 100,
    });
    return apps.map((a) => {
      const profile = a.user.businessProfile;
      return {
        id: a.id,
        userId: a.userId,
        status: a.status,
        submittedAt: a.submittedAt.toISOString(),
        ownerName: a.user.fullName,
        accountEmail: a.user.email,
        businessName: profile?.businessName ?? a.user.fullName,
        businessEmail: profile?.businessEmail ?? a.user.email,
        businessType: profile?.businessType ?? null,
        gstin: profile?.gstin ?? null,
        pan: profile?.pan ?? null,
        drugLicenseNumber: profile?.drugLicenseNumber ?? null,
        pharmacyRegistrationNumber: profile?.pharmacyRegistrationNumber ?? null,
        mobile: profile?.mobile ?? null,
        address: profile
          ? {
              line1: profile.addressLine1,
              line2: profile.addressLine2,
              city: profile.city,
              state: profile.state,
              pin: profile.pin,
            }
          : null,
      };
    });
  }

  async basicAnalytics(): Promise<{
    pendingKyc: number;
    approvedBuyers: number;
    ordersThisMonth: number;
    grossThisMonthPaise: number;
    salesByCity: Awaited<ReturnType<AdminService['grossSalesByCity']>>;
  }> {
    const startOfMonth = AdminService.utcMonthStart();

    const [pendingKyc, approvedBuyers, ordersAgg, salesByCity] = await Promise.all([
      this.prisma.kycApplication.count({
        where: { status: { in: ['PENDING_VERIFICATION', 'UNDER_REVIEW'] } },
      }),
      this.prisma.user.count({
        where: { accountStatus: 'APPROVED', roles: { has: 'BUYER' }, deletedAt: null },
      }),
      this.prisma.order.aggregate({
        where: { placedAt: { gte: startOfMonth } },
        _count: { _all: true },
        _sum: { totalPaise: true },
      }),
      this.buildSalesByCityReport(startOfMonth),
    ]);

    return {
      pendingKyc,
      approvedBuyers,
      ordersThisMonth: ordersAgg._count._all,
      grossThisMonthPaise: Number(ordersAgg._sum.totalPaise ?? 0n),
      salesByCity,
    };
  }

  /** Gross sales grouped by buyer business city (current calendar month, UTC). */
  async grossSalesByCity(): Promise<{
    monthStart: string;
    totalGrossPaise: number;
    totalOrders: number;
    rows: {
      city: string;
      state: string;
      orderCount: number;
      grossPaise: number;
      sharePercent: number;
    }[];
  }> {
    return this.buildSalesByCityReport(AdminService.utcMonthStart());
  }

  async salesAnalytics(filters: { period?: string; anchor?: string }): Promise<{
    period: BuyerAnalyticsPeriod;
    anchor: string;
    label: string;
    totalGrossPaise: number;
    totalOrders: number;
    productRows: {
      productId: string;
      productName: string;
      chargedQuantity: number;
      freeQuantity: number;
      grossPaise: number;
      discountPaise: number;
      sharePercent: number;
    }[];
    regionRows: {
      region: string;
      orderCount: number;
      grossPaise: number;
      sharePercent: number;
    }[];
  }> {
    const period = AdminService.isBuyerAnalyticsPeriod(filters.period) ? filters.period : 'month';
    const anchor = AdminService.normalizeAnalyticsAnchor(period, filters.anchor);
    const range = AdminService.businessPeriodRange(period, anchor);
    const orders = await this.prisma.order.findMany({
      where: { placedAt: { gte: range.start, lt: range.end } },
      include: {
        items: true,
        buyer: { select: { businessProfile: { select: { city: true } } } },
      },
    });

    const totalGrossPaise = orders.reduce((sum, order) => sum + Number(order.totalPaise), 0);
    const productBuckets = new Map<
      string,
      {
        productId: string;
        productName: string;
        chargedQuantity: number;
        freeQuantity: number;
        grossPaise: number;
        discountPaise: number;
      }
    >();
    const regionBuckets = new Map<
      string,
      { region: string; orderCount: number; grossPaise: number }
    >();

    for (const order of orders) {
      const city = order.buyer.businessProfile?.city.trim();
      const region = city && city.length > 0 ? city : 'Unknown';
      const regionBucket = regionBuckets.get(region) ?? { region, orderCount: 0, grossPaise: 0 };
      regionBucket.orderCount += 1;
      regionBucket.grossPaise += Number(order.totalPaise);
      regionBuckets.set(region, regionBucket);

      for (const item of order.items) {
        const bucket = productBuckets.get(item.productId) ?? {
          productId: item.productId,
          productName: item.productNameSnapshot,
          chargedQuantity: 0,
          freeQuantity: 0,
          grossPaise: 0,
          discountPaise: 0,
        };
        bucket.chargedQuantity += item.quantity;
        bucket.freeQuantity += item.schemeFreeQuantity;
        bucket.grossPaise += Number(item.lineTotalPaise);
        bucket.discountPaise += Number(item.discountPaise);
        productBuckets.set(item.productId, bucket);
      }
    }

    const share = (value: number): number =>
      totalGrossPaise > 0 ? Math.round((value * 1000) / totalGrossPaise) / 10 : 0;

    return {
      period,
      anchor,
      label: AdminService.analyticsPeriodLabel(period, anchor),
      totalGrossPaise,
      totalOrders: orders.length,
      productRows: [...productBuckets.values()]
        .map((row) => ({ ...row, sharePercent: share(row.grossPaise) }))
        .sort((a, b) => b.grossPaise - a.grossPaise),
      regionRows: [...regionBuckets.values()]
        .map((row) => ({ ...row, sharePercent: share(row.grossPaise) }))
        .sort((a, b) => b.grossPaise - a.grossPaise),
    };
  }

  private static utcMonthStart(): Date {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);
    return startOfMonth;
  }

  private static businessPeriodStarts(now = new Date()): Record<BuyerAnalyticsPeriod, Date> {
    const indiaOffsetMs = 5.5 * 60 * 60 * 1000;
    const businessNow = new Date(now.getTime() + indiaOffsetMs);
    const year = businessNow.getUTCFullYear();
    const month = businessNow.getUTCMonth();
    const date = businessNow.getUTCDate();
    const day = businessNow.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;

    return {
      day: new Date(Date.UTC(year, month, date) - indiaOffsetMs),
      week: new Date(Date.UTC(year, month, date + mondayOffset) - indiaOffsetMs),
      month: new Date(Date.UTC(year, month, 1) - indiaOffsetMs),
      year: new Date(Date.UTC(year, 0, 1) - indiaOffsetMs),
    };
  }

  private static isBuyerAnalyticsPeriod(value: string | undefined): value is BuyerAnalyticsPeriod {
    return value === 'day' || value === 'week' || value === 'month' || value === 'year';
  }

  private static normalizeAnalyticsAnchor(
    period: BuyerAnalyticsPeriod,
    anchor: string | undefined,
  ): string {
    const current = AdminService.currentBusinessParts();
    if (period === 'day') {
      const parsed = AdminService.parseAnchorDate(anchor);
      return `${parsed.year}-${String(parsed.month + 1).padStart(2, '0')}-${String(parsed.date).padStart(2, '0')}`;
    }
    if (period === 'week') {
      const start = AdminService.parseAnchorWeek(anchor);
      return AdminService.isoWeekKey(start);
    }
    if (period === 'month') {
      const parsed = AdminService.parseAnchorMonth(anchor);
      return `${parsed.year}-${String(parsed.month + 1).padStart(2, '0')}`;
    }
    return String(AdminService.parseAnchorYear(anchor) || current.year);
  }

  private static formatUtcDate(date: Date, options: Intl.DateTimeFormatOptions): string {
    return date.toLocaleDateString('en-IN', { ...options, timeZone: 'UTC' });
  }

  private static analyticsPeriodLabel(period: BuyerAnalyticsPeriod, anchor: string): string {
    if (period === 'day') {
      const { year, month, date } = AdminService.parseAnchorDate(anchor);
      return AdminService.formatUtcDate(new Date(Date.UTC(year, month, date)), {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
    if (period === 'week') {
      const start = AdminService.parseAnchorWeek(anchor);
      const end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 6);
      return `${anchor.replace('-W', ' Week ')} · ${AdminService.formatUtcDate(start, {
        day: '2-digit',
        month: 'short',
      })} - ${AdminService.formatUtcDate(end, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })}`;
    }
    if (period === 'month') {
      const { year, month } = AdminService.parseAnchorMonth(anchor);
      return AdminService.formatUtcDate(new Date(Date.UTC(year, month, 1)), {
        month: 'long',
        year: 'numeric',
      });
    }
    return anchor;
  }

  private static currentBusinessParts(now = new Date()): {
    year: number;
    month: number;
    date: number;
  } {
    const indiaOffsetMs = 5.5 * 60 * 60 * 1000;
    const businessNow = new Date(now.getTime() + indiaOffsetMs);
    return {
      year: businessNow.getUTCFullYear(),
      month: businessNow.getUTCMonth(),
      date: businessNow.getUTCDate(),
    };
  }

  private static businessDateStart(year: number, month: number, date: number): Date {
    const indiaOffsetMs = 5.5 * 60 * 60 * 1000;
    return new Date(Date.UTC(year, month, date) - indiaOffsetMs);
  }

  private static parseAnchorDate(anchor: string | undefined): {
    year: number;
    month: number;
    date: number;
  } {
    const match = anchor?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return AdminService.currentBusinessParts();
    }

    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const date = Number(match[3]);
    const parsed = new Date(Date.UTC(year, month, date));
    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month ||
      parsed.getUTCDate() !== date
    ) {
      return AdminService.currentBusinessParts();
    }

    return { year, month, date };
  }

  private static isoWeekKey(date: Date): string {
    const day = date.getUTCDay() || 7;
    const thursday = new Date(date);
    thursday.setUTCDate(date.getUTCDate() + 4 - day);
    const year = thursday.getUTCFullYear();
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${year}-W${String(week).padStart(2, '0')}`;
  }

  private static isoWeekStart(year: number, week: number): Date | null {
    if (week < 1 || week > 53) return null;

    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = jan4.getUTCDay() || 7;
    const start = new Date(jan4);
    start.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (week - 1) * 7);
    return AdminService.isoWeekKey(start) === `${year}-W${String(week).padStart(2, '0')}`
      ? start
      : null;
  }

  private static parseAnchorWeek(anchor: string | undefined): Date {
    const weekMatch = /^(\d{4})-W(\d{2})$/.exec(anchor ?? '');
    if (weekMatch) {
      const start = AdminService.isoWeekStart(Number(weekMatch[1]), Number(weekMatch[2]));
      if (start) return start;
    }

    const { year, month, date } = AdminService.parseAnchorDate(anchor);
    const anchorDate = new Date(Date.UTC(year, month, date));
    const day = anchorDate.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    return new Date(Date.UTC(year, month, date + mondayOffset));
  }

  private static parseAnchorMonth(anchor: string | undefined): { year: number; month: number } {
    const match = anchor?.match(/^(\d{4})-(\d{2})$/);
    if (!match) {
      const current = AdminService.currentBusinessParts();
      return { year: current.year, month: current.month };
    }

    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    if (month < 0 || month > 11) {
      const current = AdminService.currentBusinessParts();
      return { year: current.year, month: current.month };
    }

    return { year, month };
  }

  private static parseAnchorYear(anchor: string | undefined): number {
    const match = anchor?.match(/^(\d{4})$/);
    return match ? Number(match[1]) : AdminService.currentBusinessParts().year;
  }

  private static businessPeriodRange(
    period: BuyerAnalyticsPeriod,
    anchor: string | undefined,
  ): { start: Date; end: Date } {
    if (period === 'day') {
      const { year, month, date } = AdminService.parseAnchorDate(anchor);
      const start = AdminService.businessDateStart(year, month, date);
      return { start, end: AdminService.businessDateStart(year, month, date + 1) };
    }

    if (period === 'week') {
      const startDate = AdminService.parseAnchorWeek(anchor);
      const start = AdminService.businessDateStart(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate(),
      );
      const end = AdminService.businessDateStart(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate() + 7,
      );
      return { start, end };
    }

    if (period === 'month') {
      const { year, month } = AdminService.parseAnchorMonth(anchor);
      return {
        start: AdminService.businessDateStart(year, month, 1),
        end: AdminService.businessDateStart(year, month + 1, 1),
      };
    }

    const year = AdminService.parseAnchorYear(anchor);
    return {
      start: AdminService.businessDateStart(year, 0, 1),
      end: AdminService.businessDateStart(year + 1, 0, 1),
    };
  }

  private orderPeriodAggregate(
    buyerId: string,
    start: Date,
    end?: Date,
  ): Promise<{ _count: { _all: number }; _sum: { totalPaise: bigint | null } }> {
    return this.prisma.order.aggregate({
      where: { buyerId, placedAt: end ? { gte: start, lt: end } : { gte: start } },
      _count: { _all: true },
      _sum: { totalPaise: true },
    });
  }

  private toBuyerPeriodSummary(aggregate: {
    _count: { _all: number };
    _sum: { totalPaise: bigint | null };
  }): BuyerPeriodSummary {
    const orderCount = aggregate._count._all;
    const totalPaise = Number(aggregate._sum.totalPaise ?? 0n);
    return {
      orderCount,
      totalPaise,
      averageOrderPaise: orderCount > 0 ? Math.round(totalPaise / orderCount) : 0,
    };
  }

  private async buildSalesByCityReport(startOfMonth: Date): Promise<{
    monthStart: string;
    totalGrossPaise: number;
    totalOrders: number;
    rows: {
      city: string;
      state: string;
      orderCount: number;
      grossPaise: number;
      sharePercent: number;
    }[];
  }> {
    const orders = await this.prisma.order.findMany({
      where: { placedAt: { gte: startOfMonth } },
      select: {
        totalPaise: true,
        buyer: {
          select: {
            businessProfile: { select: { city: true, state: true } },
          },
        },
      },
    });

    const buckets = new Map<
      string,
      { city: string; state: string; orderCount: number; grossPaise: bigint }
    >();

    for (const order of orders) {
      const profile = order.buyer.businessProfile;
      const city = profile?.city.trim() ?? 'Unknown';
      const state = profile?.state.trim() ?? 'Unknown';
      const key = `${city}\0${state}`;
      const existing = buckets.get(key) ?? { city, state, orderCount: 0, grossPaise: 0n };
      existing.orderCount += 1;
      existing.grossPaise += order.totalPaise;
      buckets.set(key, existing);
    }

    const totalGrossPaise = orders.reduce((sum, o) => sum + o.totalPaise, 0n);
    const totalOrders = orders.length;

    const rows = [...buckets.values()]
      .map((row) => {
        const grossPaise = Number(row.grossPaise);
        const sharePercent =
          totalGrossPaise > 0n
            ? Math.round((Number(row.grossPaise) * 1000) / Number(totalGrossPaise)) / 10
            : 0;
        return {
          city: row.city,
          state: row.state,
          orderCount: row.orderCount,
          grossPaise,
          sharePercent,
        };
      })
      .sort((a, b) => b.grossPaise - a.grossPaise);

    return {
      monthStart: startOfMonth.toISOString(),
      totalGrossPaise: Number(totalGrossPaise),
      totalOrders,
      rows,
    };
  }
}
