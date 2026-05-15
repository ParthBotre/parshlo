import { Injectable } from '@nestjs/common';
import { type OrderStatus } from '@parshlo/types';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listAllOrders(filters: { status?: OrderStatus; take?: number }): Promise<
    {
      id: string;
      orderNumber: string;
      status: string;
      placedAt: string;
      buyerBusinessName: string;
      buyerGstin: string;
      totalPaise: number;
      itemCount: number;
    }[]
  > {
    const orders = await this.prisma.order.findMany({
      where: filters.status ? { status: filters.status } : undefined,
      orderBy: { placedAt: 'desc' },
      take: Math.min(filters.take ?? 100, 500),
      include: { _count: { select: { items: true } } },
    });
    return orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      placedAt: o.placedAt.toISOString(),
      buyerBusinessName: o.buyerBusinessName,
      buyerGstin: o.buyerGstin,
      totalPaise: Number(o.totalPaise),
      itemCount: o._count.items,
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
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      accountStatus: u.accountStatus,
      businessName: u.businessProfile?.businessName ?? null,
      gstin: u.businessProfile?.gstin ?? null,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  async listPendingKyc(): Promise<
    {
      id: string;
      userId: string;
      status: string;
      businessName: string;
      submittedAt: string;
    }[]
  > {
    const apps = await this.prisma.kycApplication.findMany({
      where: { status: { in: ['PENDING_VERIFICATION', 'UNDER_REVIEW'] } },
      include: { user: { include: { businessProfile: true } } },
      orderBy: { submittedAt: 'asc' },
      take: 100,
    });
    return apps.map((a) => ({
      id: a.id,
      userId: a.userId,
      status: a.status,
      businessName: a.user.businessProfile?.businessName ?? a.user.fullName,
      submittedAt: a.submittedAt.toISOString(),
    }));
  }

  async basicAnalytics(): Promise<{
    pendingKyc: number;
    approvedBuyers: number;
    ordersThisMonth: number;
    grossThisMonthPaise: number;
  }> {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const [pendingKyc, approvedBuyers, ordersAgg] = await Promise.all([
      this.prisma.kycApplication.count({
        where: { status: { in: ['PENDING_VERIFICATION', 'UNDER_REVIEW'] } },
      }),
      this.prisma.user.count({ where: { accountStatus: 'APPROVED' } }),
      this.prisma.order.aggregate({
        where: { placedAt: { gte: startOfMonth } },
        _count: { _all: true },
        _sum: { totalPaise: true },
      }),
    ]);

    return {
      pendingKyc,
      approvedBuyers,
      ordersThisMonth: ordersAgg._count._all,
      grossThisMonthPaise: Number(ordersAgg._sum.totalPaise ?? 0n),
    };
  }
}
