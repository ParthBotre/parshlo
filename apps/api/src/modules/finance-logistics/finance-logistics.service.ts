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

  private validateStatementPeriod(start: Date, end: Date): void {
    if (start >= end) {
      throw new BadRequestException({ code: 'INVALID_BILLING_PERIOD' });
    }
    if (!isBusinessCalendarMonthRange(start, end)) {
      throw new BadRequestException({
        code: 'BILLING_PERIOD_MUST_BE_MONTHLY',
        message: 'Courier statements must cover one complete calendar month.',
      });
    }
  }

  private async assertNoOverlappingStatement(
    tx: Prisma.TransactionClient,
    input: { courierId: string; billingPeriodStart: Date; billingPeriodEnd: Date },
    excludeStatementId?: string,
  ): Promise<void> {
    const overlap = await tx.courierLedgerStatement.findFirst({
      where: {
        courierId: input.courierId,
        ...(excludeStatementId ? { id: { not: excludeStatementId } } : {}),
        billingPeriodStart: { lte: input.billingPeriodEnd },
        billingPeriodEnd: { gte: input.billingPeriodStart },
      },
      select: { id: true, statementInvoiceNumber: true },
    });
    if (overlap) {
      throw new ConflictException({
        code: 'STATEMENT_PERIOD_ALREADY_EXISTS',
        message:
          'A statement already exists for this courier and billing month. Edit that statement or add an adjustment consignment line instead.',
      });
    }
  }

  private async findOpenStatementForConsignment(
    tx: Prisma.TransactionClient,
    courierId: string,
    consignmentDate: Date,
  ) {
    return tx.courierLedgerStatement.findFirst({
      where: {
        courierId,
        billingPeriodStart: { lte: consignmentDate },
        billingPeriodEnd: { gte: consignmentDate },
        status: { not: 'PAID' },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

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
    const lineStatus = status === 'RECONCILED' ? 'MATCHED' : 'DISCREPANCY';

    await tx.courierLedgerStatement.update({
      where: { id: statementId },
      data: {
        systemCalculatedTotalPaise: systemCalculated,
        status,
      },
    });
    await tx.adminConsignmentLog.updateMany({
      where: { statementId, status: { not: 'MANUALLY_RESOLVED' } },
      data: { status: lineStatus },
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

  private async assertUniqueCourierName(name: string, excludeId?: string): Promise<void> {
    const existing = await this.prisma.courierPartner.findFirst({
      where: {
        name: { equals: name.trim(), mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({
        code: 'COURIER_PARTNER_EXISTS',
        message: 'A courier partner with this name already exists.',
      });
    }
  }

  async createCourierPartner(name: string) {
    const trimmed = name.trim();
    await this.assertUniqueCourierName(trimmed);
    return this.prisma.courierPartner.create({ data: { name: trimmed } });
  }

  async updateCourierPartner(id: string, input: { name?: string; isActive?: boolean }) {
    const existing = await this.prisma.courierPartner.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'COURIER_NOT_FOUND' });

    const nextName = input.name?.trim();
    if (nextName && nextName !== existing.name) {
      await this.assertUniqueCourierName(nextName, id);
    }

    return this.prisma.courierPartner.update({
      where: { id },
      data: {
        ...(nextName ? { name: nextName } : {}),
        ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      },
    });
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
    associatedPoNumber?: string | null;
    associatedOrderNumber?: string | null;
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
      const matchingStatement = await this.findOpenStatementForConsignment(
        tx,
        dto.courierId,
        dto.consignmentDate,
      );

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
          status: matchingStatement ? 'MATCHED' : 'UNBILLED',
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

  async updateConsignment(
    id: string,
    dto: {
      courierId?: string;
      type?: 'INCOMING' | 'OUTGOING';
      docketNumber?: string;
      consignmentDate?: Date;
      amountPaise?: bigint;
      weightKg?: number | null;
      boxCount?: number;
      associatedPoNumber?: string | null;
      associatedOrderNumber?: string | null;
    },
  ) {
    const consignment = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.adminConsignmentLog.findUnique({
        where: { id },
        include: { statement: { select: { id: true, status: true } } },
      });
      if (!existing) throw new NotFoundException({ code: 'CONSIGNMENT_NOT_FOUND' });
      if (existing.statement?.status === 'PAID') {
        throw new BadRequestException({
          code: 'PAID_STATEMENT_LINE_LOCKED',
          message: 'Consignments attached to paid statements are locked.',
        });
      }

      const nextCourierId = dto.courierId ?? existing.courierId;
      const nextDocketNumber = dto.docketNumber ?? existing.docketNumber;
      const nextConsignmentDate = dto.consignmentDate ?? existing.consignmentDate;

      if (dto.courierId) {
        const courier = await tx.courierPartner.findUnique({ where: { id: dto.courierId } });
        if (!courier) throw new NotFoundException({ code: 'COURIER_NOT_FOUND' });
      }

      if (nextCourierId !== existing.courierId || nextDocketNumber !== existing.docketNumber) {
        const duplicate = await tx.adminConsignmentLog.findUnique({
          where: {
            courierId_docketNumber: {
              courierId: nextCourierId,
              docketNumber: nextDocketNumber,
            },
          },
          select: { id: true },
        });
        if (duplicate && duplicate.id !== id) {
          throw new ConflictException({ code: 'DOCKET_ALREADY_EXISTS' });
        }
      }

      const matchingStatement = await this.findOpenStatementForConsignment(
        tx,
        nextCourierId,
        nextConsignmentDate,
      );

      const updated = await tx.adminConsignmentLog.update({
        where: { id },
        data: {
          courierId: nextCourierId,
          type: dto.type ?? existing.type,
          docketNumber: nextDocketNumber,
          consignmentDate: nextConsignmentDate,
          amountPaise: dto.amountPaise ?? existing.amountPaise,
          weightKg: dto.weightKg === undefined ? existing.weightKg : dto.weightKg,
          boxCount: dto.boxCount ?? existing.boxCount,
          statementId: matchingStatement?.id ?? null,
          status: matchingStatement ? 'MATCHED' : 'UNBILLED',
          associatedPoNumber:
            dto.associatedPoNumber === undefined
              ? existing.associatedPoNumber
              : dto.associatedPoNumber,
          associatedOrderNumber:
            dto.associatedOrderNumber === undefined
              ? existing.associatedOrderNumber
              : dto.associatedOrderNumber,
        },
        include: { courier: true, statement: { select: { status: true } } },
      });

      const statementIds = new Set<string>();
      if (existing.statementId) statementIds.add(existing.statementId);
      if (matchingStatement?.id) statementIds.add(matchingStatement.id);
      for (const statementId of statementIds) {
        await this.recalculateStatement(tx, statementId);
      }

      return tx.adminConsignmentLog.findUniqueOrThrow({
        where: { id: updated.id },
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

  async deleteConsignment(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.adminConsignmentLog.findUnique({
        where: { id },
        include: { statement: { select: { status: true } } },
      });
      if (!existing) throw new NotFoundException({ code: 'CONSIGNMENT_NOT_FOUND' });
      if (existing.statement?.status === 'PAID') {
        throw new BadRequestException({
          code: 'PAID_STATEMENT_LINE_LOCKED',
          message: 'Consignments attached to paid statements are locked.',
        });
      }

      await tx.adminConsignmentLog.delete({ where: { id } });

      if (existing.statementId) {
        await this.recalculateStatement(tx, existing.statementId);
      }
    });
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

    this.validateStatementPeriod(dto.billingPeriodStart, dto.billingPeriodEnd);

    return this.prisma.$transaction(async (tx) => {
      await this.assertNoOverlappingStatement(tx, dto);

      const aggregate = await tx.adminConsignmentLog.aggregate({
        _sum: { amountPaise: true },
        where: {
          courierId: dto.courierId,
          consignmentDate: { gte: dto.billingPeriodStart, lte: dto.billingPeriodEnd },
          status: 'UNBILLED',
          statementId: null,
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
          statementId: null,
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

  async updateStatement(
    id: string,
    dto: {
      courierId?: string;
      statementInvoiceNumber?: string;
      billingPeriodStart?: Date;
      billingPeriodEnd?: Date;
      courierChargedTotalPaise?: bigint;
    },
  ) {
    const statement = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.courierLedgerStatement.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException({ code: 'STATEMENT_NOT_FOUND' });
      if (existing.status === 'PAID') {
        throw new BadRequestException({
          code: 'STATEMENT_ALREADY_PAID',
          message: 'Paid statements are locked. Create a new monthly statement adjustment instead.',
        });
      }

      const nextCourierId = dto.courierId ?? existing.courierId;
      const nextInvoiceNumber = dto.statementInvoiceNumber ?? existing.statementInvoiceNumber;
      const nextBillingPeriodStart = dto.billingPeriodStart ?? existing.billingPeriodStart;
      const nextBillingPeriodEnd = dto.billingPeriodEnd ?? existing.billingPeriodEnd;
      const nextCourierChargedTotalPaise =
        dto.courierChargedTotalPaise ?? existing.courierChargedTotalPaise;

      if (dto.courierId) {
        const courier = await tx.courierPartner.findUnique({ where: { id: dto.courierId } });
        if (!courier) throw new NotFoundException({ code: 'COURIER_NOT_FOUND' });
      }

      this.validateStatementPeriod(nextBillingPeriodStart, nextBillingPeriodEnd);

      const duplicateInvoice = await tx.courierLedgerStatement.findFirst({
        where: {
          id: { not: id },
          courierId: nextCourierId,
          statementInvoiceNumber: nextInvoiceNumber,
        },
        select: { id: true },
      });
      if (duplicateInvoice) {
        throw new ConflictException({ code: 'STATEMENT_ALREADY_EXISTS' });
      }

      await this.assertNoOverlappingStatement(
        tx,
        {
          courierId: nextCourierId,
          billingPeriodStart: nextBillingPeriodStart,
          billingPeriodEnd: nextBillingPeriodEnd,
        },
        id,
      );

      await tx.courierLedgerStatement.update({
        where: { id },
        data: {
          courierId: nextCourierId,
          statementInvoiceNumber: nextInvoiceNumber,
          billingPeriodStart: nextBillingPeriodStart,
          billingPeriodEnd: nextBillingPeriodEnd,
          courierChargedTotalPaise: nextCourierChargedTotalPaise,
        },
      });

      await tx.adminConsignmentLog.updateMany({
        where: {
          statementId: id,
          status: { not: 'MANUALLY_RESOLVED' },
          OR: [
            { courierId: { not: nextCourierId } },
            { consignmentDate: { lt: nextBillingPeriodStart } },
            { consignmentDate: { gt: nextBillingPeriodEnd } },
          ],
        },
        data: { statementId: null, status: 'UNBILLED' },
      });

      await tx.adminConsignmentLog.updateMany({
        where: {
          courierId: nextCourierId,
          consignmentDate: { gte: nextBillingPeriodStart, lte: nextBillingPeriodEnd },
          statementId: null,
          status: 'UNBILLED',
        },
        data: { statementId: id, status: 'MATCHED' },
      });

      await this.recalculateStatement(tx, id);

      const updated = await tx.courierLedgerStatement.findUniqueOrThrow({
        where: { id },
        include: { courier: true, _count: { select: { consignments: true } } },
      });

      return this.serializeStatement(updated);
    });

    return statement;
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

  async deleteStatement(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.courierLedgerStatement.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException({ code: 'STATEMENT_NOT_FOUND' });
      if (existing.status === 'PAID') {
        throw new BadRequestException({
          code: 'STATEMENT_ALREADY_PAID',
          message: 'Paid statements are locked.',
        });
      }

      await tx.adminConsignmentLog.updateMany({
        where: { statementId: id },
        data: { statementId: null, status: 'UNBILLED' },
      });
      await tx.courierLedgerStatement.delete({ where: { id } });
    });
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
