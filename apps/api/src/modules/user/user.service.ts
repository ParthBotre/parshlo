import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type CreateMyHrExpenseInput,
  type CreateMyHrWorkLogInput,
  type EmployeeSalarySlipDownloadResponse,
  type HrExpenseView,
  type HrSalarySlipView,
  type HrWorkLogView,
  type PublicUser,
} from '@parshlo/types';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

import { PrismaService } from '../prisma/prisma.service.js';

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function expenseMonthBounds(value: string): { start: Date; end: Date } {
  const date = parseDateOnly(value);
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

function formatDisplayDate(value: Date | null): string {
  if (!value) return '';
  const [year, month, day] = formatDateOnly(value).split('-');
  return `${day}/${month}/${year}`;
}

function formatMonthYear(value: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(value);
}

function toNumber(value: bigint | number): number {
  return typeof value === 'bigint' ? Number(value) : value;
}

function formatInr(paise: bigint | number): string {
  const rupees = toNumber(paise) / 100;
  return `Rs. ${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees)}`;
}

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND' });
    }
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async listSalarySlips(employeeId: string): Promise<HrSalarySlipView[]> {
    const slips = await this.prisma.employeeSalarySlip.findMany({
      where: { employeeId },
      include: { employee: { select: { fullName: true } } },
      orderBy: [{ periodMonth: 'desc' }, { createdAt: 'desc' }],
    });
    return slips.map((slip) => this.toSalarySlipView(slip));
  }

  async listExpenses(employeeId: string): Promise<HrExpenseView[]> {
    const expenses = await this.prisma.employeeExpense.findMany({
      where: { employeeId },
      include: { employee: { select: { fullName: true } } },
      orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
    });
    return expenses.map((expense) => this.toExpenseView(expense));
  }

  async listWorkLogs(employeeId: string): Promise<HrWorkLogView[]> {
    const logs = await this.prisma.employeeWorkLog.findMany({
      where: { employeeId },
      include: { employee: { select: { fullName: true } } },
      orderBy: [{ workDate: 'desc' }, { createdAt: 'desc' }],
      take: 120,
    });
    return logs.map((log) => this.toWorkLogView(log));
  }

  async upsertWorkLog(employeeId: string, input: CreateMyHrWorkLogInput): Promise<HrWorkLogView> {
    const workDate = parseDateOnly(input.workDate);
    const totalDoctors = input.orthCalls + input.mdCalls + input.gpCalls + input.otherCalls;
    const data = {
      worked: input.worked,
      location: input.location?.trim().toUpperCase() ?? null,
      orthCalls: input.orthCalls,
      mdCalls: input.mdCalls,
      gpCalls: input.gpCalls,
      otherCalls: input.otherCalls,
      totalDoctors,
      totalChemist: input.totalChemist,
      note: input.note?.trim() ?? null,
    };
    const log = await this.prisma.employeeWorkLog.upsert({
      where: { employeeId_workDate: { employeeId, workDate } },
      create: { employeeId, workDate, ...data },
      update: data,
      include: { employee: { select: { fullName: true } } },
    });
    return this.toWorkLogView(log);
  }

  async createExpense(employeeId: string, input: CreateMyHrExpenseInput): Promise<HrExpenseView> {
    const { start, end } = expenseMonthBounds(input.expenseDate);
    const monthlyTotal = await this.prisma.employeeExpense.aggregate({
      where: {
        employeeId,
        status: { not: 'REJECTED' },
        expenseDate: { gte: start, lte: end },
      },
      _sum: { amountPaise: true },
    });
    const nextTotalPaise = toNumber(monthlyTotal._sum.amountPaise ?? 0) + input.amountPaise;
    if (nextTotalPaise > 1_500_000) {
      throw new BadRequestException({
        code: 'EXPENSE_LIMIT_EXCEEDED',
        message: 'Monthly expenses cannot exceed Rs. 15,000.',
      });
    }

    const expense = await this.prisma.employeeExpense.create({
      data: {
        employeeId,
        expenseDate: parseDateOnly(input.expenseDate),
        type: input.type,
        amountPaise: input.amountPaise,
        description: input.description?.trim() ?? null,
        billKey: input.billKey?.trim() ?? null,
        billContentType: input.billContentType?.trim() ?? null,
      },
      include: { employee: { select: { fullName: true } } },
    });
    return this.toExpenseView(expense);
  }

  async downloadSalarySlip(
    employeeId: string,
    slipId: string,
  ): Promise<EmployeeSalarySlipDownloadResponse> {
    const slip = await this.prisma.employeeSalarySlip.findFirst({
      where: { id: slipId, employeeId },
      include: { employee: { select: { fullName: true, email: true } } },
    });
    if (!slip) {
      throw new NotFoundException({ code: 'SALARY_SLIP_NOT_FOUND' });
    }

    const record = await this.prisma.employeeHrRecord.findUnique({
      where: { employeeId },
      include: { employee: { select: { fullName: true, email: true } } },
    });
    if (!record) {
      throw new NotFoundException({ code: 'HR_RECORD_NOT_FOUND' });
    }

    const salarySlip = this.toSalarySlipView(slip);
    const fileName = `salary_slip_${record.employeeCode}_${formatDateOnly(slip.periodMonth).slice(0, 7)}.pdf`;
    const bytes = await this.renderSalarySlipPdf(record, slip);

    return {
      salarySlip,
      fileName,
      contentType: 'application/pdf',
      contentBase64: Buffer.from(bytes).toString('base64'),
    };
  }

  private toSalarySlipView(slip: {
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

  private toExpenseView(expense: {
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

  private toWorkLogView(workLog: {
    id: string;
    employeeId: string;
    employee: { fullName: string };
    workDate: Date;
    worked: boolean;
    location: string | null;
    orthCalls: number;
    mdCalls: number;
    gpCalls: number;
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
      otherCalls: workLog.otherCalls,
      totalDoctors: workLog.totalDoctors,
      totalChemist: workLog.totalChemist,
      note: workLog.note,
      createdAt: workLog.createdAt.toISOString(),
      updatedAt: workLog.updatedAt.toISOString(),
    };
  }

  private async renderSalarySlipPdf(
    record: {
      employee: { fullName: string; email: string };
      employeeCode: string;
      roleTitle: string;
      headQuarter: string;
      gender: string | null;
      department: string | null;
      region: string | null;
      bankDetails: string | null;
      bankAccountNumber: string | null;
      panNumber: string | null;
    },
    slip: {
      periodMonth: Date;
      workingDays: number;
      basicPaise: bigint;
      hraPaise: bigint;
      specialAllowancePaise: bigint;
      deductionPaise: bigint;
      netPayPaise: bigint;
      transactionDate: Date | null;
      transactionReference: string | null;
      notes: string | null;
    },
  ): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([842, 595]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const draw = (text: string, x: number, y: number, size = 9, useBold = false): void => {
      page.drawText(text, {
        x,
        y,
        size,
        font: useBold ? bold : font,
        color: rgb(0.06, 0.07, 0.08),
      });
    };
    const line = (x1: number, y1: number, x2: number, y2: number): void => {
      page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.6 });
    };

    const monthYear = formatMonthYear(slip.periodMonth).toUpperCase();
    const department = record.department ?? '';
    const region = record.region ?? record.headQuarter;
    const bankDetails = record.bankDetails ?? '';
    const bankAccountNumber = record.bankAccountNumber ?? '';
    const totalEarnings =
      toNumber(slip.basicPaise) + toNumber(slip.hraPaise) + toNumber(slip.specialAllowancePaise);
    const totalDeduction = toNumber(slip.deductionPaise);

    draw('PRISURE MEDICARE', 40, 558, 13, true);
    draw('SALARY SLIP FOR THE MONTH OF', 315, 558, 10, true);
    draw(monthYear, 505, 558, 10, true);

    let y = 520;
    draw(`EMPLOYEE NAME : ${record.employee.fullName}`, 40, y, 9, true);
    draw(`EMPLOYEE NO. : ${record.employeeCode}`, 470, y, 9, true);
    y -= 26;
    draw(`DESIGNATION : ${record.roleTitle}`, 40, y);
    draw(`DEPARTMENT : ${department}`, 470, y);
    y -= 26;
    draw(`GENDER : ${record.gender ?? ''}`, 40, y);
    draw(`REGION : ${region}`, 470, y);
    y -= 26;
    draw(`PAN NO. : ${record.panNumber ?? ''}`, 40, y);
    draw(`PAID DAYS : ${slip.workingDays}`, 470, y);
    y -= 26;
    draw(`BANK DETAILS : ${bankDetails}`, 40, y);
    draw(`BANK A/C NO. : ${bankAccountNumber}`, 470, y);

    y -= 36;
    draw('EARNINGS', 40, y, 9, true);
    draw('Payroll', 230, y, 9, true);
    draw('DEDUCTION', 430, y, 9, true);
    draw('Payroll', 620, y, 9, true);
    line(40, y - 6, 760, y - 6);

    y -= 24;
    draw('BASIC', 40, y);
    draw(formatInr(slip.basicPaise), 230, y);
    draw('MH - PROF. TAX', 430, y);
    draw(formatInr(slip.deductionPaise), 620, y);
    y -= 22;
    draw('HRA', 40, y);
    draw(formatInr(slip.hraPaise), 230, y);
    draw('INCOME TAX (TDS)', 430, y);
    y -= 22;
    draw('SPECIAL ALLOWANCE', 40, y);
    draw(formatInr(slip.specialAllowancePaise), 230, y);
    draw('LOAN', 430, y);
    y -= 22;
    draw('ADVANCE', 430, y);

    y -= 30;
    line(40, y + 16, 760, y + 16);
    draw(`Total Earnings : ${formatInr(totalEarnings)}`, 40, y, 9, true);
    draw(`Total Deduction : ${formatInr(totalDeduction)}`, 430, y, 9, true);
    y -= 22;
    draw(`Total Payable : ${formatInr(slip.netPayPaise)}`, 430, y, 10, true);

    y -= 34;
    draw(`NEFT/ DD/ CHQ DATE: ${formatDisplayDate(slip.transactionDate)}`, 40, y);
    draw(`NEFT/ DD/ CHQ NO.: ${slip.transactionReference ?? ''}`, 300, y);
    draw(`AMOUNT: ${formatInr(slip.netPayPaise)}`, 580, y);
    y -= 28;
    draw(`Remarks : ${slip.notes ?? ''}`, 40, y);
    y -= 26;
    draw('Since this is computer generated slip no need of signature.', 40, y);

    y -= 34;
    draw(
      '- - - - - - - - - - - - - - - - - - - - - - - Cut Here - - - - - - - - - - - - - - - - - - - - - - -',
      40,
      y,
    );
    y -= 28;
    draw('Kindly cut here and send HO', 40, y, 9, true);
    y -= 26;
    draw(`I have received salary for the month of ${monthYear}`, 255, y, 9, true);
    y -= 28;
    draw(`NEFT/ DD/ CHQ DATE: ${formatDisplayDate(slip.transactionDate)}`, 40, y);
    draw(`NEFT/ DD/ CHQ NO.: ${slip.transactionReference ?? ''}`, 300, y);
    draw(`AMOUNT: ${formatInr(slip.netPayPaise)}`, 580, y);
    y -= 36;
    draw(`Name : ${record.employee.fullName}`, 500, y);
    y -= 22;
    draw('Division : PARSHLO', 500, y);
    y -= 22;
    draw(`Region : ${region}`, 500, y);

    return pdf.save();
  }
}
