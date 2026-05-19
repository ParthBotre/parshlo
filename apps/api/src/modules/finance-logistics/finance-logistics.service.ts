import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type Prisma } from '@parshlo/db';

import { PrismaService } from '../prisma/prisma.service.js';

const BUSINESS_TIME_ZONE = 'Asia/Kolkata';

function calendarParts(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
  };
}

function isBusinessCalendarMonthRange(start: Date, end: Date): boolean {
  const startParts = calendarParts(start);
  const endParts = calendarParts(end);
  if (
    startParts.day !== 1 ||
    startParts.hour !== 0 ||
    startParts.minute !== 0 ||
    startParts.second !== 0
  ) {
    return false;
  }

  const lastDay = new Date(Date.UTC(startParts.year, startParts.month, 0)).getUTCDate();
  return (
    endParts.year === startParts.year &&
    endParts.month === startParts.month &&
    endParts.day === lastDay &&
    endParts.hour === 23 &&
    endParts.minute === 59 &&
    endParts.second === 59 &&
    end.getMilliseconds() === 999
  );
}

@Injectable()
export class FinanceLogisticsService {
  constructor(private readonly prisma: PrismaService) {}

  private async recalculateStatement(
    tx: Prisma.TransactionClient,
    statementId: string,
  ): Promise<void> {
    const statement = await tx.courierLedgerStatement.findUnique({
      where: { id: statementId },
    });
    if (!statement) throw new NotFoundException({ code: 'STATEMENT_NOT_FOUND' });
    if (statement.status === 'PAID') {
      throw new BadRequestException({
        code: 'STATEMENT_ALREADY_PAID',
        message: 'Paid statements are locked. Create a new monthly statement adjustment instead.',
      });
    }

    const aggregate = await tx.adminConsignmentLog.aggregate({
      _sum: { amountPaise: true },
      where: { statementId },
    });
    const systemCalculated = aggregate._sum.amountPaise ?? 0n;
    const status =
      systemCalculated === statement.courierChargedTotalPaise ? 'RECONCILED' : 'FLAGGED';
    const consignmentStatus = status === 'RECONCILED' ? 'MATCHED' : 'DISCREPANCY';

    await tx.courierLedgerStatement.update({
      where: { id: statementId },
      data: {
        systemCalculatedTotalPaise: systemCalculated,
        status,
      },
    });
    await tx.adminConsignmentLog.updateMany({
      where: { statementId },
      data: { status: consignmentStatus },
    });
  }

  private serializeConsignment<
    T extends {
      consignmentDate: Date;
      amountPaise: bigint;
      createdAt: Date;
      updatedAt: Date;
    },
  >(
    consignment: T,
  ): Omit<T, 'consignmentDate' | 'amountPaise' | 'createdAt' | 'updatedAt'> & {
    consignmentDate: string;
    amountPaise: string;
    createdAt: string;
    updatedAt: string;
  } {
    return {
      ...consignment,
      consignmentDate: consignment.consignmentDate.toISOString(),
      amountPaise: consignment.amountPaise.toString(),
      createdAt: consignment.createdAt.toISOString(),
      updatedAt: consignment.updatedAt.toISOString(),
    };
  }

  private serializeStatement<
    T extends {
      billingPeriodStart: Date;
      billingPeriodEnd: Date;
      courierChargedTotalPaise: bigint;
      systemCalculatedTotalPaise: bigint;
      createdAt: Date;
      updatedAt: Date;
    },
  >(
    statement: T,
  ): Omit<
    T,
    | 'billingPeriodStart'
    | 'billingPeriodEnd'
    | 'courierChargedTotalPaise'
    | 'systemCalculatedTotalPaise'
    | 'createdAt'
    | 'updatedAt'
  > & {
    billingPeriodStart: string;
    billingPeriodEnd: string;
    courierChargedTotalPaise: string;
    systemCalculatedTotalPaise: string;
    createdAt: string;
    updatedAt: string;
  } {
    return {
      ...statement,
      billingPeriodStart: statement.billingPeriodStart.toISOString(),
      billingPeriodEnd: statement.billingPeriodEnd.toISOString(),
      courierChargedTotalPaise: statement.courierChargedTotalPaise.toString(),
      systemCalculatedTotalPaise: statement.systemCalculatedTotalPaise.toString(),
      createdAt: statement.createdAt.toISOString(),
      updatedAt: statement.updatedAt.toISOString(),
    };
  }

  // ─── Courier Partners ────────────────────────────────────────────────────────

  listCourierPartners() {
    return this.prisma.courierPartner.findMany({ orderBy: { name: 'asc' } });
  }

  createCourierPartner(name: string) {
    return this.prisma.courierPartner.create({ data: { name } });
  }

  // ─── Consignment Logs ────────────────────────────────────────────────────────

  async listConsignments(filters: { courierId?: string; status?: string }) {
    const consignments = await this.prisma.adminConsignmentLog.findMany({
      where: {
        ...(filters.courierId ? { courierId: filters.courierId } : {}),
        ...(filters.status ? { status: filters.status as never } : {}),
      },
      include: { courier: true, statement: { select: { status: true } } },
      orderBy: { consignmentDate: 'desc' },
      take: 500,
    });
    return consignments.map((consignment) => this.serializeConsignment(consignment));
  }

  async logConsignment(dto: {
    courierId: string;
    type: 'INCOMING' | 'OUTGOING';
    docketNumber: string;
    consignmentDate: Date;
    amountPaise: bigint;
    weightKg?: number;
    boxCount: number;
    associatedPoNumber?: string;
    associatedOrderNumber?: string;
  }) {
    const courier = await this.prisma.courierPartner.findUnique({
      where: { id: dto.courierId },
    });
    if (!courier) throw new NotFoundException({ code: 'COURIER_NOT_FOUND' });

    const existing = await this.prisma.adminConsignmentLog.findUnique({
      where: {
        courierId_docketNumber: {
          courierId: dto.courierId,
          docketNumber: dto.docketNumber,
        },
      },
    });
    if (existing) throw new ConflictException({ code: 'DOCKET_ALREADY_EXISTS' });

    const consignment = await this.prisma.$transaction(async (tx) => {
      const matchingStatement = await tx.courierLedgerStatement.findFirst({
        where: {
          courierId: dto.courierId,
          billingPeriodStart: { lte: dto.consignmentDate },
          billingPeriodEnd: { gte: dto.consignmentDate },
          status: { not: 'PAID' },
        },
        orderBy: { createdAt: 'desc' },
      });

      const created = await tx.adminConsignmentLog.create({
        data: {
          courierId: dto.courierId,
          type: dto.type,
          docketNumber: dto.docketNumber,
          consignmentDate: dto.consignmentDate,
          amountPaise: dto.amountPaise,
          weightKg: dto.weightKg,
          boxCount: dto.boxCount,
          statementId: matchingStatement?.id,
          status: matchingStatement ? 'DISCREPANCY' : 'UNBILLED',
          associatedPoNumber: dto.associatedPoNumber,
          associatedOrderNumber: dto.associatedOrderNumber,
        },
      });

      if (matchingStatement) {
        await this.recalculateStatement(tx, matchingStatement.id);
      }

      return tx.adminConsignmentLog.findUniqueOrThrow({
        where: { id: created.id },
        include: { courier: true, statement: { select: { status: true } } },
      });
    });

    return this.serializeConsignment(consignment);
  }

  async updateConsignmentStatus(id: string, status: 'MANUALLY_RESOLVED') {
    const entry = await this.prisma.adminConsignmentLog.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException({ code: 'CONSIGNMENT_NOT_FOUND' });
    const consignment = await this.prisma.adminConsignmentLog.update({
      where: { id },
      data: { status },
      include: { courier: true, statement: { select: { status: true } } },
    });
    return this.serializeConsignment(consignment);
  }

  // ─── Reconciliation ──────────────────────────────────────────────────────────

  async listStatements(courierId?: string) {
    const statements = await this.prisma.courierLedgerStatement.findMany({
      where: courierId ? { courierId } : undefined,
      include: { courier: true, _count: { select: { consignments: true } } },
      orderBy: { billingPeriodEnd: 'desc' },
    });
    return statements.map((statement) => this.serializeStatement(statement));
  }

  async reconcileStatement(dto: {
    courierId: string;
    statementInvoiceNumber: string;
    billingPeriodStart: Date;
    billingPeriodEnd: Date;
    courierChargedTotalPaise: bigint;
  }) {
    const courier = await this.prisma.courierPartner.findUnique({
      where: { id: dto.courierId },
    });
    if (!courier) throw new NotFoundException({ code: 'COURIER_NOT_FOUND' });

    const duplicate = await this.prisma.courierLedgerStatement.findUnique({
      where: {
        courierId_statementInvoiceNumber: {
          courierId: dto.courierId,
          statementInvoiceNumber: dto.statementInvoiceNumber,
        },
      },
    });
    if (duplicate) throw new ConflictException({ code: 'STATEMENT_ALREADY_EXISTS' });

    if (dto.billingPeriodStart >= dto.billingPeriodEnd) {
      throw new BadRequestException({ code: 'INVALID_BILLING_PERIOD' });
    }
    if (!isBusinessCalendarMonthRange(dto.billingPeriodStart, dto.billingPeriodEnd)) {
      throw new BadRequestException({
        code: 'BILLING_PERIOD_MUST_BE_MONTHLY',
        message: 'Courier statements must cover one complete calendar month.',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const aggregate = await tx.adminConsignmentLog.aggregate({
        _sum: { amountPaise: true },
        where: {
          courierId: dto.courierId,
          consignmentDate: { gte: dto.billingPeriodStart, lte: dto.billingPeriodEnd },
          status: 'UNBILLED',
        },
      });

      const systemCalculated = aggregate._sum.amountPaise ?? 0n;
      const isPerfectMatch = systemCalculated === dto.courierChargedTotalPaise;

      const statement = await tx.courierLedgerStatement.create({
        data: {
          courierId: dto.courierId,
          statementInvoiceNumber: dto.statementInvoiceNumber,
          billingPeriodStart: dto.billingPeriodStart,
          billingPeriodEnd: dto.billingPeriodEnd,
          courierChargedTotalPaise: dto.courierChargedTotalPaise,
          systemCalculatedTotalPaise: systemCalculated,
          status: isPerfectMatch ? 'RECONCILED' : 'FLAGGED',
        },
      });

      await tx.adminConsignmentLog.updateMany({
        where: {
          courierId: dto.courierId,
          consignmentDate: { gte: dto.billingPeriodStart, lte: dto.billingPeriodEnd },
          status: 'UNBILLED',
        },
        data: {
          statementId: statement.id,
          status: isPerfectMatch ? 'MATCHED' : 'DISCREPANCY',
        },
      });

      const statementWithRelations = await tx.courierLedgerStatement.findUniqueOrThrow({
        where: { id: statement.id },
        include: { courier: true, _count: { select: { consignments: true } } },
      });

      return this.serializeStatement(statementWithRelations);
    });
  }

  async markStatementPaid(id: string) {
    const stmt = await this.prisma.courierLedgerStatement.findUnique({ where: { id } });
    if (!stmt) throw new NotFoundException({ code: 'STATEMENT_NOT_FOUND' });
    const statement = await this.prisma.courierLedgerStatement.update({
      where: { id },
      data: { status: 'PAID' },
      include: { courier: true, _count: { select: { consignments: true } } },
    });
    return this.serializeStatement(statement);
  }

  async discrepancyReport(statementId: string) {
    const statement = await this.prisma.courierLedgerStatement.findUnique({
      where: { id: statementId },
      include: { courier: true },
    });
    if (!statement) throw new NotFoundException({ code: 'STATEMENT_NOT_FOUND' });

    const consignments = await this.prisma.adminConsignmentLog.findMany({
      where: { statementId, status: 'DISCREPANCY' },
      orderBy: { consignmentDate: 'asc' },
    });

    const entries = await Promise.all(
      consignments.map(async (c) => {
        const linkedOrder = await this.prisma.order.findFirst({
          where: { courierDocketNumber: c.docketNumber },
          select: { orderNumber: true, buyerBusinessName: true },
        });
        return { consignment: c, linkedOrder };
      }),
    );

    return { statement, entries };
  }
}
