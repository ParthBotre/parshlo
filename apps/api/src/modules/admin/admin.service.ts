import { readFile } from 'node:fs/promises';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Prisma } from '@parshlo/db';
import { JobProducer } from '@parshlo/queue';
import {
  type ArchiveHrEmployeeInput,
  type AddSecondarySalesStockistInput,
  type AdminCreateBuyerInput,
  type AdminCreateEmployeeInput,
  type CompanyHolidayView,
  type CreateHrExpenseInput,
  type EmailHrDocumentInput,
  type EmailHrDocumentResponse,
  type CreateLeaveRequestInput,
  type GenerateHrExpenseSlipInput,
  type GenerateHrExpenseSlipResponse,
  type GenerateHrDocumentInput,
  type GenerateHrDocumentResponse,
  type GenerateHrSalarySlipInput,
  type GenerateHrSalarySlipResponse,
  type AdminUpdateBuyerInput,
  type AdminEmployeeView,
  type AdminUpdateEmployeeInput,
  type AuthPrincipal,
  type EmployeeRole,
  type EmployeeLeaveBalanceView,
  type EmployeeLeaveDashboardView,
  type EmployeeLeaveRequestView,
  type HrDashboardView,
  type HrDocumentView,
  type HrEmployeeRecordView,
  type HrExpenseAllowanceSummaryView,
  type HrExpenseSlipView,
  type HrExpenseView,
  type HrSalarySlipView,
  type HrWorkLogView,
  type OrderStatus,
  type ReviewHrExpenseInput,
  type ReviewLeaveRequestInput,
  type SecondarySalesDashboardView,
  type UpdateCompanyHolidayInput,
  type UpsertSecondarySalesEntryInput,
  type UpsertHrEmployeeRecordInput,
  type UpsertHrWorkLogInput,
  type UpsertCompanyHolidayInput,
  type WorkReportCsvDownloadResponse,
  type WorkReportPdfDownloadResponse,
} from '@parshlo/types';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

import {
  renderExpenseSlipPdf,
  renderSalarySlipPdf,
  renderWorkReportCsv,
  renderWorkReportPdf,
} from '../hr/hr-pdf.js';
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

const HR_DOCUMENT_REQUIRED_CC = ['hemantbotre@gmail.com'];
const HR_DOCUMENT_REPLY_TO = 'superadmin@parshlo.com';

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

interface SecondaryStockistQuantityTotals {
  primaryQuantity: number;
  secondaryQuantity: number;
  closingQuantity: number;
  balanceQuantity: number;
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function formatDateDisplay(value: Date | null): string {
  if (!value) return '-';
  const [year, month, day] = formatDateOnly(value).split('-');
  return `${day}/${month}/${year}`;
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

function countWeekdaysInclusive(start: Date, end: Date): number {
  let count = 0;
  for (
    let cursor = new Date(start);
    cursor.getTime() <= end.getTime();
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  ) {
    const day = cursor.getUTCDay();
    if (day !== 0) count += 1;
  }
  return count;
}

function dateKey(value: Date): string {
  return formatDateOnly(value);
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
  courierPartnerName: string | null;
  courierPartnerWebsiteUrl: string | null;
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

  private normalizeEmailList(values: string[] | undefined, excluded: string[] = []): string[] {
    const excludedSet = new Set(excluded.map((value) => this.normalizeEmail(value)));
    const seen = new Set<string>();
    const emails: string[] = [];
    for (const value of values ?? []) {
      const email = this.normalizeEmail(value);
      if (!email || excludedSet.has(email) || seen.has(email)) continue;
      seen.add(email);
      emails.push(email);
    }
    return emails;
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
      courierPartnerName: string | null;
      courierPartnerWebsiteUrl: string | null;
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
        courierPartner: { select: { name: true, websiteUrl: true } },
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
        courierPartnerName: o.courierPartner?.name ?? null,
        courierPartnerWebsiteUrl: o.courierPartner?.websiteUrl ?? null,
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
        include: {
          _count: { select: { items: true } },
          courierPartner: { select: { name: true, websiteUrl: true } },
        },
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
        courierPartnerName: order.courierPartner?.name ?? null,
        courierPartnerWebsiteUrl: order.courierPartner?.websiteUrl ?? null,
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
        NOT: { roles: { has: 'BUYER' } },
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
    const [records, documents, salarySlips, expenseSlips, expenses, workLogs, leaveRequests] =
      await Promise.all([
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
        this.prisma.employeeExpenseSlip.findMany({
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
          take: 1000,
          include: { employee: { select: { fullName: true } } },
          orderBy: { workDate: 'desc' },
        }),
        this.prisma.employeeLeaveRequest.findMany({
          take: 200,
          include: {
            employee: { select: { id: true, fullName: true, email: true } },
            reviewedBy: { select: { id: true, fullName: true } },
          },
          orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
        }),
      ]);

    return {
      records: records.map((record) => this.toHrRecordView(record)),
      documents: documents.map((document) => this.toHrDocumentView(document)),
      salarySlips: salarySlips.map((salarySlip) => this.toHrSalarySlipView(salarySlip)),
      expenseSlips: expenseSlips.map((expenseSlip) => this.toHrExpenseSlipView(expenseSlip)),
      expenses: expenses.map((expense) => this.toHrExpenseView(expense)),
      workLogs: workLogs.map((workLog) => this.toHrWorkLogView(workLog)),
      leaveRequests: leaveRequests.map((request) => this.toLeaveRequestView(request)),
    };
  }

  async upsertHrRecord(input: UpsertHrEmployeeRecordInput): Promise<HrEmployeeRecordView> {
    const employeeCode = input.employeeCode.trim().toUpperCase();
    const employee = await this.prisma.user.findFirst({
      where: {
        id: input.employeeId,
        deletedAt: null,
        NOT: { roles: { has: 'BUYER' } },
      },
      select: { id: true, fullName: true, email: true },
    });
    if (!employee) {
      throw new NotFoundException({ code: 'EMPLOYEE_NOT_FOUND' });
    }

    const duplicateCode = await this.prisma.employeeHrRecord.findFirst({
      where: {
        employeeCode,
        NOT: { employeeId: input.employeeId },
      },
      include: { employee: { select: { fullName: true } } },
    });
    if (duplicateCode) {
      throw new ConflictException({
        code: 'EMPLOYEE_CODE_ALREADY_EXISTS',
        message: `Employee code ${employeeCode} is already assigned to ${duplicateCode.employee.fullName}.`,
      });
    }

    const salary = splitSalary(input.grossMonthlyPaise);
    const existingRecord = await this.prisma.employeeHrRecord.findUnique({
      where: { employeeId: input.employeeId },
      select: { serialNumber: true },
    });
    const nextSerialNumber =
      input.serialNumber ?? existingRecord?.serialNumber ?? (await this.nextHrSerialNumber());
    const record = await this.prisma.employeeHrRecord.upsert({
      where: { employeeId: input.employeeId },
      create: {
        employeeId: input.employeeId,
        employeeCode,
        serialNumber: nextSerialNumber,
        namePrefix: this.normalizeOptionalText(input.namePrefix),
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
        aadhaarNumber: this.normalizeOptionalText(input.aadhaarNumber),
        grossMonthlyPaise: input.grossMonthlyPaise,
        basicMonthlyPaise: salary.basicMonthlyPaise,
        hraMonthlyPaise: salary.hraMonthlyPaise,
        specialAllowanceMonthlyPaise: salary.specialAllowanceMonthlyPaise,
        allowanceMonthlyPaise: input.allowanceMonthlyPaise,
        dailyAllowancePaise: input.dailyAllowancePaise,
        petrolAllowancePaise: input.petrolAllowancePaise,
        mobileAllowancePaise: input.mobileAllowancePaise,
        deductionPaise: input.deductionPaise,
      },
      update: {
        employeeCode,
        serialNumber: nextSerialNumber,
        namePrefix: this.normalizeOptionalText(input.namePrefix),
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
        aadhaarNumber: this.normalizeOptionalText(input.aadhaarNumber),
        grossMonthlyPaise: input.grossMonthlyPaise,
        basicMonthlyPaise: salary.basicMonthlyPaise,
        hraMonthlyPaise: salary.hraMonthlyPaise,
        specialAllowanceMonthlyPaise: salary.specialAllowanceMonthlyPaise,
        allowanceMonthlyPaise: input.allowanceMonthlyPaise,
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
    await this.assertCanSubmitWorkLog(input.employeeId, workDate);
    const totalDoctors =
      input.orthCalls + input.mdCalls + input.gpCalls + input.gynCalls + input.otherCalls;
    const data = {
      worked: input.worked,
      location: this.normalizeOptionalUpper(input.location),
      orthCalls: input.orthCalls,
      mdCalls: input.mdCalls,
      gpCalls: input.gpCalls,
      gynCalls: input.gynCalls,
      otherCalls: input.otherCalls,
      totalDoctors,
      totalChemist: input.totalChemist,
      note: input.note?.trim() ?? null,
    };
    const workLog = await this.prisma.employeeWorkLog.upsert({
      where: { employeeId_workDate: { employeeId: input.employeeId, workDate } },
      create: {
        employeeId: input.employeeId,
        workDate,
        ...data,
      },
      update: data,
      include: { employee: { select: { fullName: true } } },
    });
    return this.toHrWorkLogView(workLog);
  }

  async generateHrDocument(
    employeeId: string,
    actorId: string,
    input: GenerateHrDocumentInput,
  ): Promise<GenerateHrDocumentResponse> {
    const { document, fileName, bytes } = await this.createHrDocumentPdf(
      employeeId,
      actorId,
      input,
      'GENERATED',
    );

    return {
      document: this.toHrDocumentView(document),
      fileName,
      contentType: 'application/pdf',
      contentBase64: Buffer.from(bytes).toString('base64'),
    };
  }

  async emailHrDocument(
    employeeId: string,
    actorId: string,
    input: EmailHrDocumentInput,
  ): Promise<EmailHrDocumentResponse> {
    if (this.config.get<boolean>('features.emailNotificationsEnabled') !== true) {
      throw new BadRequestException({
        code: 'EMAIL_NOTIFICATIONS_DISABLED',
        message: 'Email notifications are disabled.',
      });
    }

    const { record, document, fileName, bytes } = await this.createHrDocumentPdf(
      employeeId,
      actorId,
      input,
      'EMAILED',
    );
    const recipientEmail = this.normalizeEmail(
      input.recipientEmail ?? record.mailId ?? record.employee.email,
    );
    const ccEmails = this.normalizeEmailList(
      [...HR_DOCUMENT_REQUIRED_CC, ...(input.ccEmails ?? [])],
      [recipientEmail],
    );
    const bccEmails = this.normalizeEmailList(input.bccEmails, [recipientEmail, ...ccEmails]);

    await this.jobs.enqueueEmail({
      kind: 'HR_DOCUMENT_READY',
      to: recipientEmail,
      cc: ccEmails.length > 0 ? ccEmails : undefined,
      bcc: bccEmails.length > 0 ? bccEmails : undefined,
      replyTo: HR_DOCUMENT_REPLY_TO,
      attachments: [
        {
          filename: fileName,
          content: Buffer.from(bytes).toString('base64'),
          contentType: 'application/pdf',
        },
      ],
      data: {
        employeeName: record.employee.fullName,
        documentType: input.type,
        referenceNumber: document.referenceNumber,
        ccEmails,
        bccCount: bccEmails.length,
      },
    });

    return {
      document: this.toHrDocumentView(document),
      recipientEmail,
    };
  }

  async generateHrSalarySlip(
    actorId: string,
    input: GenerateHrSalarySlipInput,
  ): Promise<GenerateHrSalarySlipResponse> {
    const record = await this.getHrRecordOrThrow(input.employeeId);
    const { start, end } = monthBounds(input.periodMonth);
    const approvedLeaves = await this.prisma.employeeLeaveRequest.findMany({
      where: {
        employeeId: input.employeeId,
        status: 'APPROVED',
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: { startDate: true, endDate: true },
    });
    const loggedWorkDays = await this.prisma.employeeWorkLog.count({
      where: {
        employeeId: input.employeeId,
        worked: true,
        workDate: { gte: start, lte: end },
      },
    });
    const leaveDays = approvedLeaves.reduce((total, leave) => {
      const overlapStart = leave.startDate > start ? leave.startDate : start;
      const overlapEnd = leave.endDate < end ? leave.endDate : end;
      return total + countWeekdaysInclusive(overlapStart, overlapEnd);
    }, 0);
    const workingDays = loggedWorkDays;
    const approvedExpenses = await this.prisma.employeeExpense.aggregate({
      where: {
        employeeId: input.employeeId,
        status: 'APPROVED',
        expenseDate: { gte: start, lte: end },
      },
      _sum: { amountPaise: true },
    });
    const approvedExpensePaise = Number(approvedExpenses._sum.amountPaise ?? 0);
    const monthlyAllowancePaise = toNumber(record.allowanceMonthlyPaise);
    const petrolAllowancePaise = toNumber(record.petrolAllowancePaise);
    const mobileAllowancePaise = toNumber(record.mobileAllowancePaise);
    const dailyAllowancePaise = Math.max(
      0,
      Math.min(
        toNumber(record.dailyAllowancePaise) * workingDays,
        monthlyAllowancePaise - petrolAllowancePaise - mobileAllowancePaise,
      ),
    );
    const grossPaise = toNumber(record.grossMonthlyPaise);
    const calculatedNetPayPaise =
      grossPaise +
      dailyAllowancePaise +
      petrolAllowancePaise +
      mobileAllowancePaise +
      input.bonusPaise -
      toNumber(record.deductionPaise);
    const netPayPaise = input.netPayPaise ?? calculatedNetPayPaise;

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

    const slipView = this.toHrSalarySlipView(salarySlip);

    return {
      salarySlip: slipView,
    };
  }

  async downloadHrSalarySlip(slipId: string): Promise<{
    salarySlip: HrSalarySlipView;
    fileName: string;
    contentType: 'application/pdf';
    contentBase64: string;
  }> {
    const slip = await this.prisma.employeeSalarySlip.findUnique({
      where: { id: slipId },
      include: { employee: { select: { fullName: true } } },
    });
    if (!slip) throw new NotFoundException({ code: 'SALARY_SLIP_NOT_FOUND' });

    const record = await this.getHrRecordOrThrow(slip.employeeId);
    const slipView = this.toHrSalarySlipView(slip);
    const periodMonth = formatDateOnly(slip.periodMonth).slice(0, 7);
    const fileName = `salary_slip_${record.employeeCode}_${periodMonth}.pdf`;
    const bytes = await renderSalarySlipPdf(
      {
        employeeName: record.employee.fullName,
        employeeCode: record.employeeCode,
        roleTitle: record.roleTitle,
        department: record.department,
        gender: record.gender,
        region: record.region,
        headQuarter: record.headQuarter,
        panNumber: record.panNumber,
        bankDetails: record.bankDetails,
        bankAccountNumber: record.bankAccountNumber,
      },
      {
        periodMonth: slip.periodMonth,
        workingDays: slip.workingDays,
        basicPaise: slip.basicPaise,
        hraPaise: slip.hraPaise,
        specialAllowancePaise: slip.specialAllowancePaise,
        deductionPaise: slip.deductionPaise,
        netPayPaise: slip.netPayPaise,
        transactionDate: slip.transactionDate,
        transactionReference: slip.transactionReference,
        notes: slip.notes,
      },
    );
    return {
      salarySlip: slipView,
      fileName,
      contentType: 'application/pdf',
      contentBase64: Buffer.from(bytes).toString('base64'),
    };
  }

  async deleteHrSalarySlip(slipId: string): Promise<void> {
    const slip = await this.prisma.employeeSalarySlip.findUnique({
      where: { id: slipId },
      select: { id: true },
    });
    if (!slip) throw new NotFoundException({ code: 'SALARY_SLIP_NOT_FOUND' });
    await this.prisma.employeeSalarySlip.delete({ where: { id: slipId } });
  }

  async generateHrExpenseSlip(
    actorId: string,
    input: GenerateHrExpenseSlipInput,
  ): Promise<GenerateHrExpenseSlipResponse> {
    await this.getHrRecordOrThrow(input.employeeId);
    const { start } = monthBounds(input.periodMonth);
    const summary = await this.buildExpenseAllowanceSummary(input.employeeId, input.periodMonth);

    const totalPayablePaise = input.totalPayablePaise ?? summary.totalApprovedPayablePaise;
    const expenseSlip = await this.prisma.employeeExpenseSlip.upsert({
      where: { employeeId_periodMonth: { employeeId: input.employeeId, periodMonth: start } },
      create: {
        employeeId: input.employeeId,
        generatedById: actorId,
        periodMonth: start,
        workingDays: summary.workingDays,
        dailyAllowancePaise: summary.dailyAllowancePaise,
        petrolAllowancePaise: summary.petrolAllowancePaise,
        mobileAllowancePaise: summary.mobileAllowancePaise,
        monthlyAllowanceCapPaise: summary.monthlyAllowanceCapPaise,
        calculatedDailyAllowancePaise: summary.calculatedDailyAllowancePaise,
        calculatedAllowancePaise: summary.calculatedAllowancePaise,
        approvedExtraExpensePaise: summary.approvedExtraExpensePaise,
        pendingExtraExpensePaise: summary.pendingExtraExpensePaise,
        totalPayablePaise,
        transactionDate: input.transactionDate ? parseDateOnly(input.transactionDate) : null,
        transactionReference: input.transactionReference?.trim() ?? null,
        notes: input.notes?.trim() ?? null,
      },
      update: {
        generatedById: actorId,
        workingDays: summary.workingDays,
        dailyAllowancePaise: summary.dailyAllowancePaise,
        petrolAllowancePaise: summary.petrolAllowancePaise,
        mobileAllowancePaise: summary.mobileAllowancePaise,
        monthlyAllowanceCapPaise: summary.monthlyAllowanceCapPaise,
        calculatedDailyAllowancePaise: summary.calculatedDailyAllowancePaise,
        calculatedAllowancePaise: summary.calculatedAllowancePaise,
        approvedExtraExpensePaise: summary.approvedExtraExpensePaise,
        pendingExtraExpensePaise: summary.pendingExtraExpensePaise,
        totalPayablePaise,
        transactionDate: input.transactionDate ? parseDateOnly(input.transactionDate) : null,
        transactionReference: input.transactionReference?.trim() ?? null,
        notes: input.notes?.trim() ?? null,
      },
      include: { employee: { select: { fullName: true } } },
    });

    return {
      expenseSlip: this.toHrExpenseSlipView(expenseSlip),
    };
  }

  async downloadHrExpenseSlip(slipId: string): Promise<{
    expenseSlip: HrExpenseSlipView;
    fileName: string;
    contentType: 'application/pdf';
    contentBase64: string;
  }> {
    const slip = await this.prisma.employeeExpenseSlip.findUnique({
      where: { id: slipId },
      include: { employee: { select: { fullName: true } } },
    });
    if (!slip) throw new NotFoundException({ code: 'EXPENSE_SLIP_NOT_FOUND' });

    const record = await this.getHrRecordOrThrow(slip.employeeId);
    const slipView = this.toHrExpenseSlipView(slip);
    const periodMonth = formatDateOnly(slip.periodMonth).slice(0, 7);
    const fileName = `expense_slip_${record.employeeCode}_${periodMonth}.pdf`;
    const { start, end } = monthBounds(periodMonth);
    const [workLogs, approvedExtraClaims] = await Promise.all([
      this.prisma.employeeWorkLog.findMany({
        where: {
          employeeId: slip.employeeId,
          worked: true,
          workDate: { gte: start, lte: end },
        },
        orderBy: [{ workDate: 'asc' }, { createdAt: 'asc' }],
        select: { workDate: true, location: true },
      }),
      this.prisma.employeeExpense.findMany({
        where: {
          employeeId: slip.employeeId,
          status: 'APPROVED',
          expenseDate: { gte: start, lte: end },
        },
        orderBy: [{ expenseDate: 'asc' }, { createdAt: 'asc' }],
        select: {
          expenseDate: true,
          type: true,
          amountPaise: true,
          description: true,
          billKey: true,
        },
      }),
    ]);
    const bytes = await renderExpenseSlipPdf(
      {
        employeeName: record.employee.fullName,
        employeeCode: record.employeeCode,
        roleTitle: record.roleTitle,
        department: record.department,
        region: record.region,
        headQuarter: record.headQuarter,
        panNumber: record.panNumber,
      },
      {
        periodMonth: slip.periodMonth,
        workingDays: slip.workingDays,
        dailyAllowancePaise: slip.dailyAllowancePaise,
        petrolAllowancePaise: slip.petrolAllowancePaise,
        mobileAllowancePaise: slip.mobileAllowancePaise,
        monthlyAllowanceCapPaise: slip.monthlyAllowanceCapPaise,
        calculatedDailyAllowancePaise: slip.calculatedDailyAllowancePaise,
        calculatedAllowancePaise: slip.calculatedAllowancePaise,
        approvedExtraExpensePaise: slip.approvedExtraExpensePaise,
        pendingExtraExpensePaise: slip.pendingExtraExpensePaise,
        totalPayablePaise: slip.totalPayablePaise,
        transactionDate: slip.transactionDate,
        transactionReference: slip.transactionReference,
        notes: slip.notes,
        workedDays: workLogs,
        extraClaims: approvedExtraClaims,
      },
    );
    return {
      expenseSlip: slipView,
      fileName,
      contentType: 'application/pdf',
      contentBase64: Buffer.from(bytes).toString('base64'),
    };
  }

  async downloadHrWorkReportPdf(
    employeeId: string,
    periodMonth: string,
  ): Promise<WorkReportPdfDownloadResponse> {
    const { record, reports, start } = await this.getHrWorkReportDownloadData(
      employeeId,
      periodMonth,
    );
    const bytes = await renderWorkReportPdf(
      {
        employeeName: record.employee.fullName,
        employeeCode: record.employeeCode,
        roleTitle: record.roleTitle,
        region: record.region,
        headQuarter: record.headQuarter,
      },
      { periodMonth: start, reports },
    );

    return {
      fileName: `work_report_${record.employeeCode}_${periodMonth}.pdf`,
      contentType: 'application/pdf',
      contentBase64: Buffer.from(bytes).toString('base64'),
    };
  }

  async downloadHrWorkReportCsv(
    employeeId: string,
    periodMonth: string,
  ): Promise<WorkReportCsvDownloadResponse> {
    const { record, reports, start } = await this.getHrWorkReportDownloadData(
      employeeId,
      periodMonth,
    );
    const bytes = renderWorkReportCsv(
      {
        employeeName: record.employee.fullName,
        employeeCode: record.employeeCode,
        roleTitle: record.roleTitle,
        region: record.region,
        headQuarter: record.headQuarter,
      },
      { periodMonth: start, reports },
    );

    return {
      fileName: `work_report_${record.employeeCode}_${periodMonth}.csv`,
      contentType: 'text/csv',
      contentBase64: Buffer.from(bytes).toString('base64'),
    };
  }

  private async getHrWorkReportDownloadData(employeeId: string, periodMonth: string) {
    const record = await this.getHrRecordOrThrow(employeeId);
    const { start, end } = monthBounds(periodMonth);
    const reports = await this.prisma.employeeWorkLog.findMany({
      where: { employeeId, workDate: { gte: start, lte: end } },
      orderBy: [{ workDate: 'asc' }, { createdAt: 'asc' }],
      select: {
        workDate: true,
        location: true,
        orthCalls: true,
        mdCalls: true,
        gpCalls: true,
        gynCalls: true,
        otherCalls: true,
        totalDoctors: true,
        totalChemist: true,
        note: true,
      },
    });
    return { record, reports, start };
  }

  private async createHrDocumentPdf(
    employeeId: string,
    actorId: string,
    input: GenerateHrDocumentInput,
    delivery: 'GENERATED' | 'EMAILED',
  ): Promise<{
    record: Awaited<ReturnType<AdminService['getHrRecordOrThrow']>>;
    document: {
      id: string;
      employeeId: string;
      type: string;
      referenceNumber: string;
      fileName: string;
      generatedAt: Date;
    };
    fileName: string;
    bytes: Uint8Array;
  }> {
    const record = await this.getHrRecordOrThrow(employeeId);
    const existingDocuments = await this.prisma.employeeHrDocument.findMany({
      where: { employeeId, type: input.type },
      orderBy: { generatedAt: 'asc' },
      select: {
        id: true,
        employeeId: true,
        type: true,
        referenceNumber: true,
        fileName: true,
        generatedAt: true,
        payload: true,
      },
    });
    const existingDocument =
      input.type === 'INCREMENT_LETTER'
        ? existingDocuments.find((document) => {
            const payload = document.payload as {
              incrementAmountPaise?: unknown;
              effectiveDate?: unknown;
            };
            return (
              payload.incrementAmountPaise === (input.incrementAmountPaise ?? 0) &&
              payload.effectiveDate === (input.effectiveDate ?? formatDateOnly(new Date()))
            );
          })
        : (existingDocuments[0] ?? null);
    const referenceNumber =
      existingDocument?.referenceNumber ?? (await this.nextHrReference(input.type, new Date()));
    const title =
      input.type === 'OFFER_LETTER'
        ? 'OFFER LETTER'
        : input.type === 'INCREMENT_LETTER'
          ? 'INCREMENT LETTER'
          : input.type === 'APPOINTMENT_ACKNOWLEDGEMENT'
            ? 'APPOINTMENT LETTER ACKNOWLEDGEMENT'
            : 'APPOINTMENT LETTER';
    const fileName = existingDocument?.fileName ?? `${referenceNumber.replace(/[/-]/g, '_')}.pdf`;
    const lines = (() => {
      if (input.type === 'OFFER_LETTER') return this.offerLetterLines(record);
      if (input.type === 'INCREMENT_LETTER') {
        return this.incrementLetterLines(
          record,
          referenceNumber,
          input.incrementAmountPaise ?? 0,
          input.effectiveDate ? parseDateOnly(input.effectiveDate) : new Date(),
        );
      }
      if (input.type === 'APPOINTMENT_ACKNOWLEDGEMENT') {
        return this.appointmentAcknowledgementLines(record, referenceNumber);
      }
      return this.appointmentLetterLines(record, referenceNumber);
    })();
    const bytes = await this.renderHrPdf(title, lines);

    const document =
      existingDocument ??
      (await this.prisma.employeeHrDocument.create({
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
            incrementAmountPaise: input.incrementAmountPaise ?? undefined,
            effectiveDate: input.effectiveDate ?? undefined,
            generatedOn: formatDateOnly(new Date()),
            delivery,
          },
        },
      }));

    return { record, document, fileName, bytes };
  }

  async listCompanyHolidays(): Promise<CompanyHolidayView[]> {
    const holidays = await this.prisma.companyHoliday.findMany({
      orderBy: [{ holidayDate: 'asc' }, { name: 'asc' }],
    });
    return holidays.map((holiday) => this.toCompanyHolidayView(holiday));
  }

  async upsertCompanyHoliday(input: UpsertCompanyHolidayInput): Promise<CompanyHolidayView> {
    const holidayDate = parseDateOnly(input.holidayDate);
    const holiday = await this.prisma.companyHoliday.upsert({
      where: { holidayDate },
      create: {
        holidayDate,
        name: input.name.trim(),
        fiscalYear: input.fiscalYear.trim(),
        isActive: input.isActive ?? true,
      },
      update: {
        name: input.name.trim(),
        fiscalYear: input.fiscalYear.trim(),
        isActive: input.isActive ?? true,
      },
    });
    return this.toCompanyHolidayView(holiday);
  }

  async updateCompanyHoliday(
    id: string,
    input: UpdateCompanyHolidayInput,
  ): Promise<CompanyHolidayView> {
    const existing = await this.prisma.companyHoliday.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'COMPANY_HOLIDAY_NOT_FOUND' });

    const holiday = await this.prisma.companyHoliday.update({
      where: { id },
      data: {
        ...(input.holidayDate ? { holidayDate: parseDateOnly(input.holidayDate) } : {}),
        ...(input.name === undefined ? {} : { name: input.name.trim() }),
        ...(input.fiscalYear === undefined ? {} : { fiscalYear: input.fiscalYear.trim() }),
        ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      },
    });
    return this.toCompanyHolidayView(holiday);
  }

  async leaveDashboard(actorId: string, actorRoles: string[]): Promise<EmployeeLeaveDashboardView> {
    const canReview = actorRoles.includes('SUPER_ADMIN');
    const year = new Date().getUTCFullYear();
    const [requests, companyHolidays] = await Promise.all([
      this.prisma.employeeLeaveRequest.findMany({
        where: canReview ? {} : { employeeId: actorId },
        include: {
          employee: { select: { id: true, fullName: true, email: true } },
          reviewedBy: { select: { id: true, fullName: true } },
        },
        orderBy: [{ status: 'asc' }, { startDate: 'asc' }, { createdAt: 'desc' }],
      }),
      this.listCompanyHolidays(),
    ]);

    return {
      currentUserId: actorId,
      canReview,
      balance: await this.leaveBalance(actorId, year),
      requests: requests.map((request) => this.toLeaveRequestView(request)),
      companyHolidays,
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

    const dayCount = await this.countPtoDays(startDate, endDate);
    if (dayCount <= 0) {
      throw new BadRequestException({
        code: 'LEAVE_DATE_RANGE_INVALID',
        message: 'Selected dates do not include payable PTO days after Sundays and holidays.',
      });
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

  private async countPtoDays(startDate: Date, endDate: Date): Promise<number> {
    const holidayDates = await this.activeCompanyHolidayDateSet(startDate, endDate);
    let count = 0;
    for (
      let cursor = new Date(startDate);
      cursor.getTime() <= endDate.getTime();
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
    ) {
      const day = cursor.getUTCDay();
      if (day === 0) continue;
      if (holidayDates.has(dateKey(cursor))) continue;
      count += 1;
    }
    return count;
  }

  private async activeCompanyHolidayDateSet(startDate: Date, endDate: Date): Promise<Set<string>> {
    const holidays = await this.prisma.companyHoliday.findMany({
      where: {
        isActive: true,
        holidayDate: { gte: startDate, lte: endDate },
      },
      select: { holidayDate: true },
    });
    return new Set(holidays.map((holiday) => dateKey(holiday.holidayDate)));
  }

  private toCompanyHolidayView(holiday: {
    id: string;
    holidayDate: Date;
    name: string;
    fiscalYear: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): CompanyHolidayView {
    return {
      id: holiday.id,
      holidayDate: formatDateOnly(holiday.holidayDate),
      name: holiday.name,
      fiscalYear: holiday.fiscalYear,
      isActive: holiday.isActive,
      createdAt: holiday.createdAt.toISOString(),
      updatedAt: holiday.updatedAt.toISOString(),
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

  private async buildExpenseAllowanceSummary(
    employeeId: string,
    periodMonth: string,
  ): Promise<HrExpenseAllowanceSummaryView> {
    const { start, end } = monthBounds(periodMonth);
    const [record, workingDays, approvedExtras, pendingExtras] = await Promise.all([
      this.prisma.employeeHrRecord.findUnique({
        where: { employeeId },
        include: { employee: { select: { fullName: true } } },
      }),
      this.prisma.employeeWorkLog.count({
        where: { employeeId, worked: true, workDate: { gte: start, lte: end } },
      }),
      this.prisma.employeeExpense.aggregate({
        where: {
          employeeId,
          status: 'APPROVED',
          expenseDate: { gte: start, lte: end },
        },
        _sum: { amountPaise: true },
      }),
      this.prisma.employeeExpense.aggregate({
        where: {
          employeeId,
          status: 'PENDING',
          expenseDate: { gte: start, lte: end },
        },
        _sum: { amountPaise: true },
      }),
    ]);
    if (!record) {
      throw new NotFoundException({
        code: 'HR_RECORD_NOT_FOUND',
        message: 'HR allowance settings are not configured for this employee.',
      });
    }

    const dailyAllowancePaise = toNumber(record.dailyAllowancePaise);
    const petrolAllowancePaise = toNumber(record.petrolAllowancePaise);
    const mobileAllowancePaise = toNumber(record.mobileAllowancePaise);
    const monthlyAllowanceCapPaise = toNumber(record.allowanceMonthlyPaise);
    const fixedAllowancePaise = petrolAllowancePaise + mobileAllowancePaise;
    const calculatedDailyAllowancePaise = Math.max(
      0,
      Math.min(dailyAllowancePaise * workingDays, monthlyAllowanceCapPaise - fixedAllowancePaise),
    );
    const calculatedAllowancePaise =
      calculatedDailyAllowancePaise + petrolAllowancePaise + mobileAllowancePaise;
    const approvedExtraExpensePaise = toNumber(approvedExtras._sum.amountPaise ?? 0);
    const pendingExtraExpensePaise = toNumber(pendingExtras._sum.amountPaise ?? 0);

    return {
      periodMonth,
      employeeId,
      employeeName: record.employee.fullName,
      workingDays,
      dailyAllowancePaise,
      petrolAllowancePaise,
      mobileAllowancePaise,
      monthlyAllowanceCapPaise,
      calculatedDailyAllowancePaise,
      calculatedAllowancePaise,
      approvedExtraExpensePaise,
      pendingExtraExpensePaise,
      totalApprovedPayablePaise: calculatedAllowancePaise + approvedExtraExpensePaise,
    };
  }

  private hrDisplayName(record: Awaited<ReturnType<AdminService['getHrRecordOrThrow']>>): string {
    const prefix = record.namePrefix?.trim();
    return prefix ? `${prefix} ${record.employee.fullName}` : record.employee.fullName;
  }

  private async assertCanSubmitWorkLog(employeeId: string, workDate: Date): Promise<void> {
    const [leaveCount, holidayCount] = await Promise.all([
      this.prisma.employeeLeaveRequest.count({
        where: {
          employeeId,
          status: 'APPROVED',
          startDate: { lte: workDate },
          endDate: { gte: workDate },
        },
      }),
      this.prisma.companyHoliday.count({
        where: {
          isActive: true,
          holidayDate: workDate,
        },
      }),
    ]);
    if (leaveCount > 0 || holidayCount > 0) {
      throw new BadRequestException({
        code: 'WORK_LOG_BLOCKED_ON_HOLIDAY',
        message: 'Work reports cannot be submitted for approved leave or company holidays.',
      });
    }
  }

  private async nextHrReference(type: string, value: Date): Promise<string> {
    const fiscalYear = fiscalYearLabel(value);
    const prefix = `PSH/HR/${type.replace(/_/g, '-')}/${fiscalYear}/`;
    const count = await this.prisma.employeeHrDocument.count({
      where: { referenceNumber: { startsWith: prefix } },
    });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  private async nextHrSerialNumber(): Promise<number> {
    const aggregate = await this.prisma.employeeHrRecord.aggregate({
      _max: { serialNumber: true },
    });
    return (aggregate._max.serialNumber ?? 0) + 1;
  }

  private toHrRecordView(record: {
    id: string;
    employeeId: string;
    employee: { fullName: string; email: string };
    employeeCode: string;
    serialNumber: number | null;
    namePrefix: string | null;
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
    aadhaarNumber: string | null;
    grossMonthlyPaise: bigint;
    basicMonthlyPaise: bigint;
    hraMonthlyPaise: bigint;
    specialAllowanceMonthlyPaise: bigint;
    allowanceMonthlyPaise: bigint;
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
      namePrefix: record.namePrefix,
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
      aadhaarNumber: record.aadhaarNumber,
      grossMonthlyPaise: toNumber(record.grossMonthlyPaise),
      basicMonthlyPaise: toNumber(record.basicMonthlyPaise),
      hraMonthlyPaise: toNumber(record.hraMonthlyPaise),
      specialAllowanceMonthlyPaise: toNumber(record.specialAllowanceMonthlyPaise),
      allowanceMonthlyPaise: toNumber(record.allowanceMonthlyPaise),
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

  private toHrExpenseSlipView(slip: {
    id: string;
    employeeId: string;
    employee: { fullName: string };
    periodMonth: Date;
    workingDays: number;
    dailyAllowancePaise: bigint;
    petrolAllowancePaise: bigint;
    mobileAllowancePaise: bigint;
    monthlyAllowanceCapPaise: bigint;
    calculatedDailyAllowancePaise: bigint;
    calculatedAllowancePaise: bigint;
    approvedExtraExpensePaise: bigint;
    pendingExtraExpensePaise: bigint;
    totalPayablePaise: bigint;
    transactionDate: Date | null;
    transactionReference: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): HrExpenseSlipView {
    return {
      id: slip.id,
      employeeId: slip.employeeId,
      employeeName: slip.employee.fullName,
      periodMonth: formatDateOnly(slip.periodMonth),
      workingDays: slip.workingDays,
      dailyAllowancePaise: toNumber(slip.dailyAllowancePaise),
      petrolAllowancePaise: toNumber(slip.petrolAllowancePaise),
      mobileAllowancePaise: toNumber(slip.mobileAllowancePaise),
      monthlyAllowanceCapPaise: toNumber(slip.monthlyAllowanceCapPaise),
      calculatedDailyAllowancePaise: toNumber(slip.calculatedDailyAllowancePaise),
      calculatedAllowancePaise: toNumber(slip.calculatedAllowancePaise),
      approvedExtraExpensePaise: toNumber(slip.approvedExtraExpensePaise),
      pendingExtraExpensePaise: toNumber(slip.pendingExtraExpensePaise),
      totalPayablePaise: toNumber(slip.totalPayablePaise),
      transactionDate: slip.transactionDate ? formatDateOnly(slip.transactionDate) : null,
      transactionReference: slip.transactionReference,
      notes: slip.notes,
      createdAt: slip.createdAt.toISOString(),
      updatedAt: slip.updatedAt.toISOString(),
    };
  }

  private toHrWorkLogView(workLog: {
    id: string;
    employeeId: string;
    employee: { fullName: string };
    workDate: Date;
    worked: boolean;
    location: string | null;
    orthCalls: number;
    mdCalls: number;
    gpCalls: number;
    gynCalls: number;
    otherCalls: number;
    totalDoctors: number;
    totalChemist: number;
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
      location: workLog.location,
      orthCalls: workLog.orthCalls,
      mdCalls: workLog.mdCalls,
      gpCalls: workLog.gpCalls,
      gynCalls: workLog.gynCalls,
      otherCalls: workLog.otherCalls,
      totalDoctors: workLog.totalDoctors,
      totalChemist: workLog.totalChemist,
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
    const displayName = this.hrDisplayName(record);
    return [
      `Date: ${formatDateDisplay(record.offerDate ?? new Date())}`,
      'Place: Pune, MH, INDIA',
      '',
      displayName,
      record.address,
      '',
      `${displayName},`,
      '',
      `With reference to your interview with Mr. Hemant Botre (CRM HEAD), we are happy to OFFER you the position of ${record.roleTitle} in our company w.e.f ${formatDateDisplay(record.joiningDate)} or any other mutually acceptable date.`,
      '',
      `During the period, you will be paid a consolidated sum of ${formatInr(annualGross)} p.a. as a basic salary subject to tax deduction.`,
      '',
      'As per company rules you are not permitted to take up any other assignment, part time or casual, with any other company or agency. All normal working hours and relevant service rules will apply.',
      '',
      'The company will not make a full and final settlement if you resign during the probation period of 6 months and the company will deduct one month basic salary if you resign without serving a notice period of 1 month.',
      '',
      'Kindly confirm your acceptance by signing copy of this letter. We welcome you on board and wish you a long successful career with PARSHLO.',
      '',
      'Best Wishes,',
      'PARSHLO',
      '',
      '',
      '(Authority Stamp)',
    ];
  }

  private appointmentLetterLines(
    record: Awaited<ReturnType<AdminService['getHrRecordOrThrow']>>,
    referenceNumber: string,
  ): string[] {
    const displayName = this.hrDisplayName(record);
    const terms = [
      'That from the date of joining duty you will be on probation for 6 months. Your service after the expiry of this probation will be confirmed subject to your sales performance and work input like average daily doctors calls, chemist calls, and reporting being found up to the mark and regular. Your probation period can be further extended if your performance is not found satisfactory.',
      'That while on probation this service agreement can be terminated by giving 24 hours notice from either side without assigning any reason. After confirmation of your service, one-month notice will be necessary to terminate this service agreement from either side without assigning any reason.',
      'Your service is liable to be transferred to any section, department, unit, branch, or affiliated subsidiary anywhere in India, existing or which may come into existence at any time. In case you fail to report for duties at the transferred place, the management may presume that you have abandoned the job on your own accord and suitable action will be taken accordingly.',
      'You will strictly follow the KEY RESULT AREA, WORK NORMS, REPORTING SYSTEMS, and GUIDELINES as per the Annexure I, II, III, and IV respectively enclosed.',
      'You may be required to promote products of associate concerns or work for associate concerns wherever the parent Company has business interest. For these services no additional salary or allowances shall be considered or reimbursed.',
      'It is obligatory on your part to abide strictly by all instructions given to you by the Company either verbally or in writing from time to time and discharge your duties faithfully, honestly, and sincerely to the best of your ability.',
      'If at any time you are certified to be unfit by a Medical Doctor or Practitioner appointed by the Company for the duties for which you have been engaged, it will be open to the Company to terminate your service.',
      'The Company follows the system of yearly appraisal of your performance in the job.',
      'You will be responsible for the safekeeping and return in good condition all Company property such as books, manuals, samples, circulars, and statements of sales statistics which may be in your use or charge.',
      'Your appointment, control, and settlement of duties will be done from the Mumbai office. Any dispute arising from this appointment will be subject to the jurisdiction of courts at Mumbai only.',
      'The company will not make a full and final settlement if you resign during the probation period of 6 months and the company will deduct one month basic salary if you resign without serving a notice period of 1 month.',
      'Your salary and package are strictly confidential and are not to be divulged to anybody. Any non-compliance in this matter will be treated as breach of trust.',
      'You will retire from the Company services on reaching the age of 58 years.',
      'The Company reserves the right to dispense with your services and terminate your employment for acts of indiscipline, misconduct, insubordination, dishonesty, absenteeism, negligence of duty, misuse of company belongings, or breach of service conditions.',
      'Such acts of indiscipline or misconduct are to be judged by your seniors or management. The decision of the Company in this regard shall be final and binding.',
    ];
    return [
      `Ref No: ${referenceNumber}`,
      `Date: ${formatDateDisplay(record.appointmentDate ?? new Date())}`,
      '',
      displayName,
      record.address,
      '',
      `${displayName},`,
      '',
      'Ref: Letter of Appointment.',
      '',
      `With reference to your application and subsequent interview you had with us, we are pleased to appoint you as ${record.roleTitle} in our organization with Head Quarter at ${record.headQuarter} w.e.f ${formatDateDisplay(record.joiningDate)}.`,
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
      'This appointment letter, apart from above, has been issued on the following terms & conditions:',
      '',
      ...terms.flatMap((term, index) => [`${index + 1}. ${term}`, '']),
      'LEAVE - You will be entitled for leave and other benefits as per the rules of the Company.',
      '(Enclosed Annexure - V)',
      '',
      'We appreciate the interest shown by you in the Company and take this opportunity to assure you that you will find your work exciting and interesting with congenial atmosphere to progress with the Company to a great extent.',
      '',
      'Yours sincerely,',
      'PARSHLO',
      '',
      '',
      '(Authority Signatory)',
    ];
  }

  private appointmentAcknowledgementLines(
    record: Awaited<ReturnType<AdminService['getHrRecordOrThrow']>>,
    referenceNumber: string,
  ): string[] {
    const displayName = this.hrDisplayName(record);
    return [
      ...this.appointmentLetterLines(record, referenceNumber),
      '',
      '',
      'ACKNOWLEDGEMENT',
      '',
      `I hereby acknowledge that I, ${displayName}, have received, read, understood, and accepted the terms and conditions stated in this appointment letter.`,
      '',
      `Employee Name: ${displayName}`,
      '',
      'Employee Signature: ______________________________',
      '',
      'Date: ______________________________',
    ];
  }

  private incrementLetterLines(
    record: Awaited<ReturnType<AdminService['getHrRecordOrThrow']>>,
    referenceNumber: string,
    incrementAmountPaise: number,
    effectiveDate: Date,
  ): string[] {
    const displayName = this.hrDisplayName(record);
    return [
      `Ref No: ${referenceNumber}`,
      `Date: ${formatDateDisplay(new Date())}`,
      '',
      displayName,
      record.address,
      '',
      `${displayName},`,
      '',
      'Sub: Increment Letter',
      '',
      `We are pleased to inform you that your monthly compensation has been revised with an increment of ${formatInr(incrementAmountPaise)} effective from ${formatDateDisplay(effectiveDate)}.`,
      '',
      'This revision is based on your role, responsibilities, performance, and the business requirements of the Company. All other terms and conditions of your appointment remain unchanged unless communicated separately in writing.',
      '',
      'Your salary and package remain strictly confidential and must not be divulged to anybody.',
      '',
      'Best Wishes,',
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
      'PARSHLO',
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
      `BASIC : ${formatInr(slip.basicPaise)}`,
      `HRA : ${formatInr(slip.hraPaise)}`,
      `SPECIAL ALLOWANCE : ${formatInr(slip.specialAllowancePaise)}`,
      '',
      'DEDUCTION                         Payroll',
      `MH - PROF. TAX : ${formatInr(slip.deductionPaise)}`,
      'INCOME TAX (TDS)',
      'LOAN',
      'ADVANCE',
      '',
      `Total Earnings : ${formatInr(totalEarnings)}`,
      `Total Deduction : ${formatInr(slip.deductionPaise)}`,
      `Total Payable : ${formatInr(slip.netPayPaise)}`,
      '',
      `NEFT/ DD/ CHQ DATE : ${slip.transactionDate ? formatDateDisplay(parseDateOnly(slip.transactionDate)) : '-'}`,
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
      `NEFT/ DD/ CHQ DATE : ${slip.transactionDate ? formatDateDisplay(parseDateOnly(slip.transactionDate)) : '-'}`,
      `NEFT/ DD/ CHQ NO. : ${slip.transactionReference ?? '-'}`,
      `AMOUNT : ${formatInr(slip.netPayPaise)}`,
      '',
      `Name : ${record.employee.fullName}`,
      'Division : PARSHLO',
      `Region : ${record.region ?? record.headQuarter}`,
    ];
  }

  private expenseSlipLines(
    record: Awaited<ReturnType<AdminService['getHrRecordOrThrow']>>,
    slip: HrExpenseSlipView,
    periodMonth: string,
  ): string[] {
    const monthYear = new Intl.DateTimeFormat('en-IN', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${periodMonth}-01T00:00:00.000Z`));
    return [
      'PARSHLO',
      `EXPENSE SLIP FOR THE MONTH OF ${monthYear}`,
      '',
      `EMPLOYEE NAME : ${record.employee.fullName}`,
      `EMPLOYEE NO. : ${record.employeeCode}`,
      `DESIGNATION : ${record.roleTitle}`,
      `DEPARTMENT : ${record.department ?? '-'}`,
      `REGION : ${record.region ?? record.headQuarter}`,
      `PAN NO. : ${record.panNumber ?? '-'}`,
      `WORKED DAYS : ${slip.workingDays}`,
      '',
      'AUTOMATIC ALLOWANCE',
      `DAILY ALLOWANCE : ${formatInr(slip.dailyAllowancePaise)} per worked day`,
      `DAILY ALLOWANCE PAYABLE : ${formatInr(slip.calculatedDailyAllowancePaise)}`,
      `PETROL : ${formatInr(slip.petrolAllowancePaise)}`,
      `MOBILE : ${formatInr(slip.mobileAllowancePaise)}`,
      `MONTHLY ALLOWANCE CAP : ${formatInr(slip.monthlyAllowanceCapPaise)}`,
      `AUTOMATIC ALLOWANCE TOTAL : ${formatInr(slip.calculatedAllowancePaise)}`,
      '',
      'EXTRA CLAIMS',
      `APPROVED EXTRA CLAIMS : ${formatInr(slip.approvedExtraExpensePaise)}`,
      `PENDING EXTRA CLAIMS : ${formatInr(slip.pendingExtraExpensePaise)}`,
      '',
      `TOTAL PAYABLE : ${formatInr(slip.totalPayablePaise)}`,
      '',
      `NEFT/ DD/ CHQ DATE : ${slip.transactionDate ? formatDateDisplay(parseDateOnly(slip.transactionDate)) : '-'}`,
      `NEFT/ DD/ CHQ NO. : ${slip.transactionReference ?? '-'}`,
      `AMOUNT : ${formatInr(slip.totalPayablePaise)}`,
      '',
      `Remarks : ${slip.notes ?? '-'}`,
      '',
      'Since this is computer generated slip no need of signature.',
      '',
      '- - - - - - - - - - - - - - - - - - Cut Here - - - - - - - - - - - - - - - - - -',
      '',
      `I have received expenses for the month of ${monthYear}`,
      `NEFT/ DD/ CHQ DATE : ${slip.transactionDate ? formatDateDisplay(parseDateOnly(slip.transactionDate)) : '-'}`,
      `NEFT/ DD/ CHQ NO. : ${slip.transactionReference ?? '-'}`,
      `AMOUNT : ${formatInr(slip.totalPayablePaise)}`,
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
    const letterheadBytes = await this.loadHrLetterhead();
    const letterheadPage = letterheadBytes ? (await pdf.embedPdf(letterheadBytes, [0]))[0] : null;

    const pageSize: [number, number] = letterheadPage
      ? [letterheadPage.width, letterheadPage.height]
      : [595, 842];
    const createPage = () => {
      const nextPage = pdf.addPage(pageSize);
      if (letterheadPage) {
        nextPage.drawPage(letterheadPage, {
          x: 0,
          y: 0,
          width: pageSize[0],
          height: pageSize[1],
        });
      }
      return nextPage;
    };

    let page = createPage();
    let y = letterheadPage ? pageSize[1] - 170 : pageSize[1] - 52;
    const drawCentered = (text: string, size: number): void => {
      const width = bold.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: Math.max(58, (pageSize[0] - width) / 2),
        y,
        size,
        font: bold,
        color: rgb(0.05, 0.07, 0.09),
      });
    };
    const drawKeyValue = (line: string): boolean => {
      const separator = line.includes(' : ') ? ' : ' : line.includes(': ') ? ': ' : null;
      if (!separator) return false;
      const [key, ...rest] = line.split(separator);
      const value = rest.join(separator).trim();
      if (!key || key.length > 36) return false;
      const label = `${key.trim()}${separator === ' : ' ? ' :' : ':'}`;
      const labelWidth = bold.widthOfTextAtSize(label, 9.5);
      const valueX = 58 + labelWidth + 5;
      const valueLines = wrapLine(value || '-', pageSize[0] - valueX - 58, 9.5);
      page.drawText(label, {
        x: 58,
        y,
        size: 9.5,
        font: bold,
        color: rgb(0.08, 0.1, 0.12),
      });
      valueLines.forEach((valueLine, index) => {
        if (index > 0) y -= 14;
        page.drawText(valueLine, {
          x: valueX,
          y,
          size: 9.5,
          font,
          color: rgb(0.08, 0.1, 0.12),
        });
      });
      y -= 16;
      return true;
    };

    drawCentered(title, 14);
    y -= 28;
    const wrapLine = (text: string, maxWidth: number, size: number): string[] => {
      const words = text.split(/\s+/).filter(Boolean);
      const lines: string[] = [];
      let current = '';
      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
          current = candidate;
        } else {
          if (current) lines.push(current);
          current = word;
        }
      }
      if (current) lines.push(current);
      return lines.length > 0 ? lines : [''];
    };
    const drawParagraph = (text: string, indent = 0, firstPrefix = ''): void => {
      const size = 10;
      const prefixWidth = firstPrefix ? bold.widthOfTextAtSize(firstPrefix, size) + 4 : 0;
      const maxWidth = pageSize[0] - 116 - indent - prefixWidth;
      const lines = wrapLine(text, maxWidth, size);
      lines.forEach((wrapped, index) => {
        if (y < 76) {
          page = createPage();
          y = letterheadPage ? pageSize[1] - 170 : pageSize[1] - 52;
        }
        const x = 58 + indent + (index === 0 ? prefixWidth : 0);
        if (index === 0 && firstPrefix) {
          page.drawText(firstPrefix, {
            x: 58 + indent,
            y,
            size,
            font: bold,
            color: rgb(0.08, 0.1, 0.12),
          });
        }
        page.drawText(wrapped, {
          x,
          y,
          size,
          font,
          color: rgb(0.08, 0.1, 0.12),
        });
        y -= 15;
      });
    };

    for (const line of lines) {
      if (y < 76) {
        page = createPage();
        y = letterheadPage ? pageSize[1] - 170 : pageSize[1] - 52;
      }
      const trimmed = line.trim();
      if (trimmed === '') {
        y -= 14;
        continue;
      }
      if (trimmed.startsWith('SALARY SLIP FOR THE MONTH OF') || trimmed === 'OFFER LETTER') {
        drawCentered(trimmed, 11);
        y -= 18;
        continue;
      }
      if (
        trimmed === 'EARNINGS                          Payroll' ||
        trimmed === 'DEDUCTION                         Payroll' ||
        trimmed === 'ALLOWANCES FOR FIELD WORK:'
      ) {
        page.drawText(trimmed.replace(/\s{2,}/g, ' '), {
          x: 58,
          y,
          size: 10,
          font: bold,
          color: rgb(0.05, 0.07, 0.09),
        });
        y -= 18;
        continue;
      }
      if (drawKeyValue(line)) continue;
      const numbered = /^(\d+\.\s+)(.+)$/.exec(line);
      if (numbered) {
        drawParagraph(numbered[2], 0, numbered[1]);
        y -= 3;
      } else {
        drawParagraph(line);
      }
    }

    return pdf.save();
  }

  private async loadHrLetterhead(): Promise<Uint8Array | null> {
    try {
      return await readFile('assets/hr/letterhead.pdf');
    } catch {
      // Local repository fallback when the process runs from the repo root.
    }
    try {
      return await readFile('apps/api/assets/hr/letterhead.pdf');
    } catch {
      return null;
    }
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

  async productSalesByCity(filters: {
    productId?: string;
    period?: string;
    anchor?: string;
  }): Promise<{
    period: BuyerAnalyticsPeriod;
    anchor: string;
    label: string;
    productId: string;
    productName: string;
    totalGrossPaise: number;
    totalOrders: number;
    chargedQuantity: number;
    freeQuantity: number;
    cityRows: {
      city: string;
      orderCount: number;
      chargedQuantity: number;
      freeQuantity: number;
      grossPaise: number;
      sharePercent: number;
    }[];
  }> {
    const productId = filters.productId?.trim();
    if (!productId) {
      throw new BadRequestException({
        code: 'PRODUCT_ID_REQUIRED',
        message: 'Product is required.',
      });
    }

    const period = AdminService.isBuyerAnalyticsPeriod(filters.period) ? filters.period : 'month';
    const anchor = AdminService.normalizeAnalyticsAnchor(period, filters.anchor);
    const range = AdminService.businessPeriodRange(period, anchor);
    const orders = await this.prisma.order.findMany({
      where: {
        placedAt: { gte: range.start, lt: range.end },
        items: { some: { productId } },
      },
      include: {
        items: { where: { productId } },
        buyer: { select: { businessProfile: { select: { city: true } } } },
      },
    });

    const cityBuckets = new Map<
      string,
      {
        city: string;
        orderCount: number;
        chargedQuantity: number;
        freeQuantity: number;
        grossPaise: number;
      }
    >();
    let productName = '';
    let totalGrossPaise = 0;
    let chargedQuantity = 0;
    let freeQuantity = 0;

    for (const order of orders) {
      const city = order.buyer.businessProfile?.city.trim();
      const cityName = city && city.length > 0 ? city : 'Unknown';
      const bucket = cityBuckets.get(cityName) ?? {
        city: cityName,
        orderCount: 0,
        chargedQuantity: 0,
        freeQuantity: 0,
        grossPaise: 0,
      };
      bucket.orderCount += 1;

      for (const item of order.items) {
        productName ||= item.productNameSnapshot;
        bucket.chargedQuantity += item.quantity;
        bucket.freeQuantity += item.schemeFreeQuantity;
        bucket.grossPaise += Number(item.lineTotalPaise);
        chargedQuantity += item.quantity;
        freeQuantity += item.schemeFreeQuantity;
        totalGrossPaise += Number(item.lineTotalPaise);
      }
      cityBuckets.set(cityName, bucket);
    }

    const product = productName
      ? null
      : await this.prisma.product.findUnique({ where: { id: productId }, select: { name: true } });
    const share = (value: number): number =>
      totalGrossPaise > 0 ? Math.round((value * 1000) / totalGrossPaise) / 10 : 0;

    return {
      period,
      anchor,
      label: AdminService.analyticsPeriodLabel(period, anchor),
      productId,
      productName: productName.length > 0 ? productName : (product?.name ?? 'Unknown product'),
      totalGrossPaise,
      totalOrders: orders.length,
      chargedQuantity,
      freeQuantity,
      cityRows: [...cityBuckets.values()]
        .map((row) => ({ ...row, sharePercent: share(row.grossPaise) }))
        .sort((a, b) => b.grossPaise - a.grossPaise),
    };
  }

  async secondarySalesDashboard(
    user: Pick<AuthPrincipal, 'userId' | 'roles'>,
    filters: { periodMonth?: string; stockistId?: string },
  ): Promise<SecondarySalesDashboardView> {
    const { year, month } = AdminService.parseAnchorMonth(filters.periodMonth);
    const periodMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
    const range = AdminService.businessPeriodRange('month', periodMonth);
    const periodMonthStart = range.start;
    const isSuperAdmin = user.roles.includes('SUPER_ADMIN');

    const [stockists, editorRecord, editors, employees, stockistBuyers] = await Promise.all([
      this.prisma.secondarySalesStockist.findMany({
        where: { isActive: true },
        include: {
          buyer: { select: { businessProfile: { select: { businessName: true } } } },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.secondarySalesEditor.findFirst({
        where: { userId: user.userId, revokedAt: null },
      }),
      this.prisma.secondarySalesEditor.findMany({
        where: { revokedAt: null },
        include: {
          user: true,
          grantedBy: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.findMany({
        where: {
          deletedAt: null,
          NOT: { roles: { has: 'BUYER' } },
        },
        orderBy: [{ fullName: 'asc' }],
      }),
      this.prisma.user.findMany({
        where: {
          deletedAt: null,
          accountStatus: 'APPROVED',
          businessProfile: { businessType: 'STOCKIST' },
        },
        include: { businessProfile: true },
        orderBy: { fullName: 'asc' },
      }),
    ]);

    const trackedBuyerIds = new Set(stockists.flatMap((stockist) => (stockist.buyerId ? [stockist.buyerId] : [])));
    const trackedNames = new Set(stockists.map((stockist) => AdminService.normalizedName(stockist.name)));
    const eligibleStockistBuyers = stockistBuyers
      .filter((buyer) => {
        const profile = buyer.businessProfile;
        return (
          profile &&
          !trackedBuyerIds.has(buyer.id) &&
          !trackedNames.has(AdminService.normalizedName(profile.businessName))
        );
      })
      .map((buyer) => {
        const profile = buyer.businessProfile;
        if (!profile) {
          throw new BadRequestException({ code: 'STOCKIST_PROFILE_REQUIRED' });
        }
        return {
          userId: buyer.id,
          businessName: profile.businessName,
          city: profile.city,
          state: profile.state,
          gstin: profile.gstin,
        };
      });

    if (stockists.length === 0) {
      return {
        periodMonth,
        stockists: [],
        selectedStockistId: null,
        selectedStockistName: null,
        canEdit: isSuperAdmin || Boolean(editorRecord),
        canManageEditors: isSuperAdmin,
        editors: editors.map((editor) => ({
          id: editor.id,
          userId: editor.userId,
          fullName: editor.user.fullName,
          email: editor.user.email,
          grantedAt: editor.createdAt.toISOString(),
          grantedByName: editor.grantedBy?.fullName ?? null,
        })),
        eligibleEditors: employees.map((employee) => this.toEmployeeView(employee)),
        eligibleStockistBuyers,
        stockistAnalysisRows: [],
        totals: {
          primaryQuantity: 0,
          secondaryQuantity: 0,
          closingQuantity: 0,
          balanceQuantity: 0,
        },
        rows: [],
      };
    }

    const selectedStockist = filters.stockistId
      ? (stockists.find((stockist) => stockist.id === filters.stockistId) ?? stockists[0])
      : stockists[0];

    const buyerMatches: Prisma.UserWhereInput[] = [
      {
        businessProfile: {
          businessType: 'STOCKIST',
          businessName: { equals: selectedStockist.name, mode: 'insensitive' },
        },
      },
    ];
    if (selectedStockist.buyerId) {
      buyerMatches.unshift({ id: selectedStockist.buyerId });
    }

    const [products, primaryOrders, secondaryEntries, stockistAnalysisRows] = await Promise.all([
      this.prisma.product.findMany({
        where: { deletedAt: null, status: 'ACTIVE' },
        select: { id: true, name: true, packaging: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.order.findMany({
        where: {
          placedAt: { gte: range.start, lt: range.end },
          status: { notIn: ['CANCELLED', 'REJECTED'] },
          buyer: { OR: buyerMatches },
        },
        include: { items: true },
      }),
      this.prisma.secondarySalesEntry.findMany({
        where: { stockistId: selectedStockist.id, periodMonth: periodMonthStart },
        include: {
          updatedBy: { select: { fullName: true } },
          product: { select: { id: true, name: true, packaging: true } },
        },
      }),
      this.buildSecondarySalesStockistAnalysis(stockists, range, periodMonthStart),
    ]);

    const primaryByProduct = new Map<string, number>();
    for (const order of primaryOrders) {
      for (const item of order.items) {
        primaryByProduct.set(
          item.productId,
          (primaryByProduct.get(item.productId) ?? 0) + item.quantity + item.schemeFreeQuantity,
        );
      }
    }

    const entriesByProduct = new Map(secondaryEntries.map((entry) => [entry.productId, entry]));
    const productMap = new Map(products.map((product) => [product.id, product]));
    for (const entry of secondaryEntries) {
      if (!productMap.has(entry.productId)) {
        productMap.set(entry.productId, entry.product);
      }
    }

    const rows = [...productMap.values()]
      .map((product) => {
        const entry = entriesByProduct.get(product.id);
        const primaryQuantity = primaryByProduct.get(product.id) ?? 0;
        const secondaryQuantity = entry?.secondaryQuantity ?? 0;
        const closingQuantity = entry?.closingQuantity ?? 0;
        return {
          productId: product.id,
          productName: product.name,
          packaging: product.packaging,
          primaryQuantity,
          secondaryQuantity,
          closingQuantity,
          balanceQuantity: primaryQuantity - secondaryQuantity - closingQuantity,
          notes: entry?.notes ?? null,
          updatedAt: entry?.updatedAt.toISOString() ?? null,
          updatedByName: entry?.updatedBy?.fullName ?? null,
        };
      })
      .sort((a, b) => {
        const activityDelta =
          b.primaryQuantity +
          b.secondaryQuantity +
          b.closingQuantity -
          (a.primaryQuantity + a.secondaryQuantity + a.closingQuantity);
        return activityDelta !== 0 ? activityDelta : a.productName.localeCompare(b.productName);
      });

    const totals = rows.reduce(
      (sum, row) => ({
        primaryQuantity: sum.primaryQuantity + row.primaryQuantity,
        secondaryQuantity: sum.secondaryQuantity + row.secondaryQuantity,
        closingQuantity: sum.closingQuantity + row.closingQuantity,
        balanceQuantity: sum.balanceQuantity + row.balanceQuantity,
      }),
      { primaryQuantity: 0, secondaryQuantity: 0, closingQuantity: 0, balanceQuantity: 0 },
    );

    return {
      periodMonth,
      stockists: stockists.map((stockist) => ({
        id: stockist.id,
        name: stockist.name,
        buyerId: stockist.buyerId,
        buyerBusinessName: stockist.buyer?.businessProfile?.businessName ?? null,
        isActive: stockist.isActive,
      })),
      selectedStockistId: selectedStockist.id,
      selectedStockistName: selectedStockist.name,
      canEdit: isSuperAdmin || Boolean(editorRecord),
      canManageEditors: isSuperAdmin,
      editors: editors.map((editor) => ({
        id: editor.id,
        userId: editor.userId,
        fullName: editor.user.fullName,
        email: editor.user.email,
        grantedAt: editor.createdAt.toISOString(),
        grantedByName: editor.grantedBy?.fullName ?? null,
      })),
      eligibleEditors: employees.map((employee) => this.toEmployeeView(employee)),
      eligibleStockistBuyers,
      stockistAnalysisRows,
      totals,
      rows,
    };
  }

  async upsertSecondarySalesEntry(
    user: Pick<AuthPrincipal, 'userId' | 'roles'>,
    input: UpsertSecondarySalesEntryInput,
  ): Promise<SecondarySalesDashboardView> {
    await this.assertCanEditSecondarySales(user);
    const { year, month } = AdminService.parseAnchorMonth(input.periodMonth);
    const periodMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
    const periodMonthStart = AdminService.businessPeriodRange('month', periodMonth).start;

    await Promise.all([
      this.prisma.secondarySalesStockist.findUniqueOrThrow({ where: { id: input.stockistId } }),
      this.prisma.product.findUniqueOrThrow({ where: { id: input.productId } }),
    ]);

    const notes = input.notes?.trim();
    await this.prisma.secondarySalesEntry.upsert({
      where: {
        stockistId_productId_periodMonth: {
          stockistId: input.stockistId,
          productId: input.productId,
          periodMonth: periodMonthStart,
        },
      },
      create: {
        stockistId: input.stockistId,
        productId: input.productId,
        periodMonth: periodMonthStart,
        secondaryQuantity: input.secondaryQuantity,
        closingQuantity: input.closingQuantity,
        notes: notes && notes.length > 0 ? notes : null,
        updatedById: user.userId,
      },
      update: {
        secondaryQuantity: input.secondaryQuantity,
        closingQuantity: input.closingQuantity,
        notes: notes && notes.length > 0 ? notes : null,
        updatedById: user.userId,
      },
    });

    return this.secondarySalesDashboard(user, {
      periodMonth,
      stockistId: input.stockistId,
    });
  }

  async grantSecondarySalesEditor(userId: string, actorId: string): Promise<void> {
    const employee = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
        NOT: { roles: { has: 'BUYER' } },
      },
      select: { id: true },
    });
    if (!employee) {
      throw new NotFoundException({ code: 'EMPLOYEE_NOT_FOUND' });
    }

    await this.prisma.secondarySalesEditor.upsert({
      where: { userId },
      create: { userId, grantedById: actorId },
      update: { grantedById: actorId, revokedAt: null },
    });
  }

  async revokeSecondarySalesEditor(userId: string): Promise<void> {
    await this.prisma.secondarySalesEditor.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async addSecondarySalesStockist(
    input: AddSecondarySalesStockistInput,
  ): Promise<{ stockistId: string }> {
    const buyer = await this.prisma.user.findFirst({
      where: {
        id: input.buyerId,
        deletedAt: null,
        accountStatus: 'APPROVED',
        businessProfile: { businessType: 'STOCKIST' },
      },
      include: { businessProfile: true },
    });
    if (!buyer?.businessProfile) {
      throw new NotFoundException({
        code: 'STOCKIST_BUYER_NOT_FOUND',
        message: 'Select an approved stockist buyer.',
      });
    }

    const existingForBuyer = await this.prisma.secondarySalesStockist.findUnique({
      where: { buyerId: buyer.id },
      select: { id: true },
    });
    if (existingForBuyer) {
      await this.prisma.secondarySalesStockist.update({
        where: { id: existingForBuyer.id },
        data: { isActive: true },
      });
      return { stockistId: existingForBuyer.id };
    }

    const existingForName = await this.prisma.secondarySalesStockist.findUnique({
      where: { name: buyer.businessProfile.businessName.trim().toUpperCase() },
      select: { id: true, buyerId: true },
    });
    if (existingForName?.buyerId && existingForName.buyerId !== buyer.id) {
      throw new ConflictException({
        code: 'SECONDARY_STOCKIST_NAME_ALREADY_LINKED',
        message: 'That stockist name is already linked to another buyer.',
      });
    }

    const stockist = await this.prisma.secondarySalesStockist.upsert({
      where: { name: buyer.businessProfile.businessName.trim().toUpperCase() },
      create: {
        name: buyer.businessProfile.businessName.trim().toUpperCase(),
        buyerId: buyer.id,
      },
      update: {
        buyerId: buyer.id,
        isActive: true,
      },
      select: { id: true },
    });
    return { stockistId: stockist.id };
  }

  private async assertCanEditSecondarySales(
    user: Pick<AuthPrincipal, 'userId' | 'roles'>,
  ): Promise<void> {
    if (user.roles.includes('SUPER_ADMIN')) {
      return;
    }

    const permission = await this.prisma.secondarySalesEditor.findFirst({
      where: { userId: user.userId, revokedAt: null },
      select: { id: true },
    });
    if (!permission) {
      throw new ForbiddenException({
        code: 'SECONDARY_SALES_EDIT_FORBIDDEN',
        message: 'You do not have permission to edit secondary sales.',
      });
    }
  }

  private async buildSecondarySalesStockistAnalysis(
    stockists: {
      id: string;
      name: string;
      buyerId: string | null;
      buyer: { businessProfile: { businessName: string } | null } | null;
    }[],
    range: { start: Date; end: Date },
    periodMonthStart: Date,
  ): Promise<SecondarySalesDashboardView['stockistAnalysisRows']> {
    const totalsByStockist = new Map<string, SecondaryStockistQuantityTotals>(
      stockists.map((stockist) => [
        stockist.id,
        {
          primaryQuantity: 0,
          secondaryQuantity: 0,
          closingQuantity: 0,
          balanceQuantity: 0,
        },
      ]),
    );

    const [primaryOrders, entries] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          placedAt: { gte: range.start, lt: range.end },
          status: { notIn: ['CANCELLED', 'REJECTED'] },
          buyer: { businessProfile: { businessType: 'STOCKIST' } },
        },
        include: {
          buyer: { select: { businessProfile: { select: { businessName: true } } } },
          items: { select: { quantity: true, schemeFreeQuantity: true } },
        },
      }),
      this.prisma.secondarySalesEntry.findMany({
        where: {
          stockistId: { in: stockists.map((stockist) => stockist.id) },
          periodMonth: periodMonthStart,
        },
        select: {
          stockistId: true,
          secondaryQuantity: true,
          closingQuantity: true,
        },
      }),
    ]);

    const stockistByBuyerId = new Map(
      stockists.flatMap((stockist) => (stockist.buyerId ? [[stockist.buyerId, stockist]] : [])),
    );
    const stockistByName = new Map(
      stockists.map((stockist) => [AdminService.normalizedName(stockist.name), stockist]),
    );

    for (const order of primaryOrders) {
      const stockist =
        stockistByBuyerId.get(order.buyerId) ??
        stockistByName.get(
          AdminService.normalizedName(order.buyer.businessProfile?.businessName ?? ''),
        );
      if (!stockist) {
        continue;
      }
      const orderQuantity = order.items.reduce(
        (sum, item) => sum + item.quantity + item.schemeFreeQuantity,
        0,
      );
      const totals = totalsByStockist.get(stockist.id);
      if (totals) {
        totals.primaryQuantity += orderQuantity;
      }
    }

    for (const entry of entries) {
      const totals = totalsByStockist.get(entry.stockistId);
      if (totals) {
        totals.secondaryQuantity += entry.secondaryQuantity;
        totals.closingQuantity += entry.closingQuantity;
      }
    }

    return stockists
      .map((stockist) => {
        const totals = totalsByStockist.get(stockist.id) ?? {
          primaryQuantity: 0,
          secondaryQuantity: 0,
          closingQuantity: 0,
          balanceQuantity: 0,
        };
        const balanceQuantity =
          totals.primaryQuantity - totals.secondaryQuantity - totals.closingQuantity;
        return {
          stockistId: stockist.id,
          stockistName: stockist.name,
          buyerBusinessName: stockist.buyer?.businessProfile?.businessName ?? null,
          primaryQuantity: totals.primaryQuantity,
          secondaryQuantity: totals.secondaryQuantity,
          closingQuantity: totals.closingQuantity,
          balanceQuantity,
        };
      })
      .sort((a, b) => {
        const activityDelta =
          b.primaryQuantity +
          b.secondaryQuantity +
          b.closingQuantity -
          (a.primaryQuantity + a.secondaryQuantity + a.closingQuantity);
        return activityDelta !== 0 ? activityDelta : a.stockistName.localeCompare(b.stockistName);
      });
  }

  private static normalizedName(name: string): string {
    return name.trim().replace(/\s+/g, ' ').toUpperCase();
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
