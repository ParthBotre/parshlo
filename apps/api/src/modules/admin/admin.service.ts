import { ConflictException, Injectable } from '@nestjs/common';
import { type AdminCreateBuyerInput, type OrderStatus } from '@parshlo/types';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private toBuyerRow(user: {
    id: string;
    email: string;
    fullName: string;
    accountStatus: string;
    createdAt: Date;
    businessProfile: {
      businessName: string;
      gstin: string;
      mobile: string;
      businessType: string;
      drugLicenseNumber: string;
      city: string;
      state: string;
    } | null;
  }): {
    id: string;
    email: string;
    fullName: string;
    accountStatus: string;
    businessName: string | null;
    gstin: string | null;
    mobile: string | null;
    businessType: string | null;
    drugLicenseNumber: string | null;
    city: string | null;
    state: string | null;
    createdAt: string;
  } {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      accountStatus: user.accountStatus,
      businessName: user.businessProfile?.businessName ?? null,
      gstin: user.businessProfile?.gstin ?? null,
      mobile: user.businessProfile?.mobile ?? null,
      businessType: user.businessProfile?.businessType ?? null,
      drugLicenseNumber: user.businessProfile?.drugLicenseNumber ?? null,
      city: user.businessProfile?.city ?? null,
      state: user.businessProfile?.state ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async listAllOrders(filters: { status?: OrderStatus; take?: number }): Promise<
    {
      id: string;
      orderNumber: string;
      status: string;
      placedAt: string;
      buyerBusinessName: string;
      buyerFullName: string;
      buyerGstin: string;
      buyerCity: string;
      buyerState: string;
      totalPaise: number;
      itemCount: number;
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
        buyer: {
          select: {
            fullName: true,
            businessProfile: { select: { city: true, state: true } },
          },
        },
      },
    });
    return orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      placedAt: o.placedAt.toISOString(),
      buyerBusinessName: o.buyerBusinessName,
      buyerFullName: o.buyer.fullName,
      buyerGstin: o.buyerGstin,
      buyerCity: o.buyer.businessProfile?.city.trim() ?? 'Unknown',
      buyerState: o.buyer.businessProfile?.state.trim() ?? 'Unknown',
      totalPaise: Number(o.totalPaise),
      itemCount: o._count.items,
      hasCourierReceipt: Boolean(o.courierReceiptBucket && o.courierReceiptKey),
      courierService: o.courierService,
      courierDocketNumber: o.courierDocketNumber,
      courierTrackingUpdatedAt: o.courierTrackingUpdatedAt?.toISOString() ?? null,
    }));
  }

  async listBuyers(): Promise<
    {
      id: string;
      email: string;
      fullName: string;
      accountStatus: string;
      businessName: string | null;
      gstin: string | null;
      createdAt: string;
    }[]
  > {
    const users = await this.prisma.user.findMany({
      where: { roles: { has: 'BUYER' }, deletedAt: null },
      include: { businessProfile: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return users.map((u) => this.toBuyerRow(u));
  }

  async createBuyer(
    input: AdminCreateBuyerInput,
    actorId: string,
  ): Promise<Awaited<ReturnType<AdminService['listBuyers']>>[number]> {
    const email = input.businessEmail.trim().toLowerCase();
    const gstin = input.gstin.trim().toUpperCase();

    const [existingUser, existingProfile] = await Promise.all([
      this.prisma.user.findUnique({ where: { email } }),
      this.prisma.businessProfile.findUnique({ where: { gstin } }),
    ]);

    if (existingUser && !existingUser.deletedAt) {
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
      const created = await tx.user.create({
        data: {
          auth0Id: `pending|${email}`,
          email,
          fullName: input.ownerName,
          roles: ['BUYER'],
          accountStatus: input.accountStatus,
          businessProfile: {
            create: {
              businessName: input.businessName,
              businessType: input.businessType,
              gstin,
              pan: input.pan?.trim() ? input.pan.trim().toUpperCase() : null,
              drugLicenseNumber: input.drugLicenseNumber,
              pharmacyRegistrationNumber: input.pharmacyRegistrationNumber ?? null,
              mobile: input.mobile,
              businessEmail: email,
              addressLine1: input.address.line1,
              addressLine2: input.address.line2 ?? null,
              city: input.address.city,
              state: input.address.state,
              pin: input.address.pin,
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
        pin: string;
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

  private static utcMonthStart(): Date {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);
    return startOfMonth;
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
