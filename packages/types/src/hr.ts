import { z } from 'zod';

import { EntityId, IsoDateString } from './common.js';
import { EmployeeLeaveRequestView, LeaveDateString } from './leave.js';

export const HrDocumentType = z.enum([
  'OFFER_LETTER',
  'APPOINTMENT_LETTER',
  'INCREMENT_LETTER',
  'SALARY_SLIP',
  'EXPENSE_BILL',
]);
export type HrDocumentType = z.infer<typeof HrDocumentType>;

export const HrExpenseType = z.enum(['DAILY_ALLOWANCE', 'PETROL', 'MOBILE', 'MISCELLANEOUS']);
export type HrExpenseType = z.infer<typeof HrExpenseType>;

export const HrExpenseStatus = z.enum(['PENDING', 'APPROVED', 'REJECTED']);
export type HrExpenseStatus = z.infer<typeof HrExpenseStatus>;

export const HrMoneyPaise = z.coerce.number().int().min(0).max(100_000_000_00);
export type HrMoneyPaise = z.infer<typeof HrMoneyPaise>;

export const HrEmployeeRecordView = z.object({
  id: EntityId,
  employeeId: EntityId,
  employeeName: z.string(),
  employeeEmail: z.string().email(),
  employeeCode: z.string(),
  serialNumber: z.number().int().min(1).nullable(),
  namePrefix: z.string().nullable(),
  roleTitle: z.string(),
  address: z.string(),
  headQuarter: z.string(),
  joiningDate: LeaveDateString,
  offerDate: LeaveDateString.nullable(),
  appointmentDate: LeaveDateString.nullable(),
  mobileNumber: z.string().nullable(),
  mailId: z.string().nullable(),
  gender: z.string().nullable(),
  department: z.string().nullable(),
  region: z.string().nullable(),
  bankDetails: z.string().nullable(),
  bankAccountNumber: z.string().nullable(),
  bloodGroup: z.string().nullable(),
  dateOfBirth: LeaveDateString.nullable(),
  marriageAnniversary: LeaveDateString.nullable(),
  emergencyContactPerson: z.string().nullable(),
  emergencyContactRelationship: z.string().nullable(),
  emergencyContactNumber: z.string().nullable(),
  panNumber: z.string().nullable(),
  grossMonthlyPaise: HrMoneyPaise,
  basicMonthlyPaise: HrMoneyPaise,
  hraMonthlyPaise: HrMoneyPaise,
  specialAllowanceMonthlyPaise: HrMoneyPaise,
  allowanceMonthlyPaise: HrMoneyPaise,
  dailyAllowancePaise: HrMoneyPaise,
  petrolAllowancePaise: HrMoneyPaise,
  mobileAllowancePaise: HrMoneyPaise,
  deductionPaise: HrMoneyPaise,
  archivedAt: IsoDateString.nullable(),
  archiveReason: z.string().nullable(),
  createdAt: IsoDateString,
  updatedAt: IsoDateString,
});
export type HrEmployeeRecordView = z.infer<typeof HrEmployeeRecordView>;

export const UpsertHrEmployeeRecordInputSchema = z.object({
  employeeId: EntityId,
  employeeCode: z.string().trim().min(2).max(40),
  serialNumber: z.coerce.number().int().min(1).optional().nullable(),
  namePrefix: z.string().trim().max(20).optional().nullable(),
  roleTitle: z.string().trim().min(2).max(120),
  address: z.string().trim().min(2).max(2000),
  headQuarter: z.string().trim().min(2).max(120),
  joiningDate: LeaveDateString,
  offerDate: LeaveDateString.optional().nullable(),
  appointmentDate: LeaveDateString.optional().nullable(),
  mobileNumber: z.string().trim().max(30).optional().nullable(),
  mailId: z.string().trim().email().max(160).optional().nullable(),
  gender: z.string().trim().max(40).optional().nullable(),
  department: z.string().trim().max(120).optional().nullable(),
  region: z.string().trim().max(120).optional().nullable(),
  bankDetails: z.string().trim().max(240).optional().nullable(),
  bankAccountNumber: z.string().trim().max(60).optional().nullable(),
  bloodGroup: z.string().trim().max(20).optional().nullable(),
  dateOfBirth: LeaveDateString.optional().nullable(),
  marriageAnniversary: LeaveDateString.optional().nullable(),
  emergencyContactPerson: z.string().trim().max(160).optional().nullable(),
  emergencyContactRelationship: z.string().trim().max(80).optional().nullable(),
  emergencyContactNumber: z.string().trim().max(30).optional().nullable(),
  panNumber: z.string().trim().max(20).optional().nullable(),
  grossMonthlyPaise: HrMoneyPaise,
  allowanceMonthlyPaise: HrMoneyPaise.default(1_500_000),
  dailyAllowancePaise: HrMoneyPaise.default(50_000),
  petrolAllowancePaise: HrMoneyPaise.default(100_000),
  mobileAllowancePaise: HrMoneyPaise.default(100_000),
  deductionPaise: HrMoneyPaise.default(20_000),
});
export type UpsertHrEmployeeRecordInput = z.infer<typeof UpsertHrEmployeeRecordInputSchema>;

export const ArchiveHrEmployeeInputSchema = z.object({
  archiveReason: z.string().trim().max(500).optional().nullable(),
});
export type ArchiveHrEmployeeInput = z.infer<typeof ArchiveHrEmployeeInputSchema>;

export const HrDocumentView = z.object({
  id: EntityId,
  employeeId: EntityId,
  type: HrDocumentType,
  referenceNumber: z.string(),
  fileName: z.string(),
  generatedAt: IsoDateString,
});
export type HrDocumentView = z.infer<typeof HrDocumentView>;

export const GenerateHrDocumentInputSchema = z.object({
  type: HrDocumentType.extract(['OFFER_LETTER', 'APPOINTMENT_LETTER', 'INCREMENT_LETTER']),
  incrementAmountPaise: HrMoneyPaise.optional().nullable(),
  effectiveDate: LeaveDateString.optional().nullable(),
});
export type GenerateHrDocumentInput = z.infer<typeof GenerateHrDocumentInputSchema>;

export const EmailHrDocumentInputSchema = GenerateHrDocumentInputSchema.extend({
  recipientEmail: z.string().trim().email().max(160).optional().nullable(),
  ccEmails: z.array(z.string().trim().email().max(160)).max(10).optional(),
  bccEmails: z.array(z.string().trim().email().max(160)).max(10).optional(),
});
export type EmailHrDocumentInput = z.infer<typeof EmailHrDocumentInputSchema>;

export const GenerateHrDocumentResponse = z.object({
  document: HrDocumentView,
  fileName: z.string(),
  contentType: z.literal('application/pdf'),
  contentBase64: z.string(),
});
export type GenerateHrDocumentResponse = z.infer<typeof GenerateHrDocumentResponse>;

export const EmailHrDocumentResponse = z.object({
  document: HrDocumentView,
  recipientEmail: z.string().email(),
});
export type EmailHrDocumentResponse = z.infer<typeof EmailHrDocumentResponse>;

export const HrExpenseView = z.object({
  id: EntityId,
  employeeId: EntityId,
  employeeName: z.string(),
  expenseDate: LeaveDateString,
  type: HrExpenseType,
  amountPaise: HrMoneyPaise,
  description: z.string().nullable(),
  billKey: z.string().nullable(),
  billContentType: z.string().nullable(),
  status: HrExpenseStatus,
  reviewerNote: z.string().nullable(),
  createdAt: IsoDateString,
  updatedAt: IsoDateString,
});
export type HrExpenseView = z.infer<typeof HrExpenseView>;

export const HrExpenseAllowanceSummaryView = z.object({
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/),
  employeeId: EntityId,
  employeeName: z.string(),
  workingDays: z.number().int().min(0),
  dailyAllowancePaise: HrMoneyPaise,
  petrolAllowancePaise: HrMoneyPaise,
  mobileAllowancePaise: HrMoneyPaise,
  monthlyAllowanceCapPaise: HrMoneyPaise,
  calculatedDailyAllowancePaise: HrMoneyPaise,
  calculatedAllowancePaise: HrMoneyPaise,
  approvedExtraExpensePaise: HrMoneyPaise,
  pendingExtraExpensePaise: HrMoneyPaise,
  totalApprovedPayablePaise: HrMoneyPaise,
});
export type HrExpenseAllowanceSummaryView = z.infer<typeof HrExpenseAllowanceSummaryView>;

export const CreateHrExpenseInputSchema = z.object({
  employeeId: EntityId,
  expenseDate: LeaveDateString,
  type: HrExpenseType,
  amountPaise: HrMoneyPaise,
  description: z.string().trim().max(1000).optional().nullable(),
  billKey: z.string().trim().max(500).optional().nullable(),
  billContentType: z.string().trim().max(120).optional().nullable(),
});
export type CreateHrExpenseInput = z.infer<typeof CreateHrExpenseInputSchema>;

export const CreateMyHrExpenseInputSchema = CreateHrExpenseInputSchema.omit({
  employeeId: true,
});
export type CreateMyHrExpenseInput = z.infer<typeof CreateMyHrExpenseInputSchema>;

export const ReviewHrExpenseInputSchema = z.object({
  status: HrExpenseStatus.extract(['APPROVED', 'REJECTED']),
  reviewerNote: z.string().trim().max(500).optional().nullable(),
});
export type ReviewHrExpenseInput = z.infer<typeof ReviewHrExpenseInputSchema>;

export const HrWorkLogView = z.object({
  id: EntityId,
  employeeId: EntityId,
  employeeName: z.string(),
  workDate: LeaveDateString,
  worked: z.boolean(),
  location: z.string().nullable(),
  orthCalls: z.number().int().min(0),
  mdCalls: z.number().int().min(0),
  gpCalls: z.number().int().min(0),
  otherCalls: z.number().int().min(0),
  totalDoctors: z.number().int().min(0),
  totalChemist: z.number().int().min(0),
  note: z.string().nullable(),
  createdAt: IsoDateString,
  updatedAt: IsoDateString,
});
export type HrWorkLogView = z.infer<typeof HrWorkLogView>;

export const UpsertHrWorkLogInputSchema = z.object({
  employeeId: EntityId,
  workDate: LeaveDateString,
  worked: z.boolean().default(true),
  location: z.string().trim().max(160).optional().nullable(),
  orthCalls: z.coerce.number().int().min(0).max(999).default(0),
  mdCalls: z.coerce.number().int().min(0).max(999).default(0),
  gpCalls: z.coerce.number().int().min(0).max(999).default(0),
  otherCalls: z.coerce.number().int().min(0).max(999).default(0),
  totalChemist: z.coerce.number().int().min(0).max(9999).default(0),
  note: z.string().trim().max(500).optional().nullable(),
});
export type UpsertHrWorkLogInput = z.infer<typeof UpsertHrWorkLogInputSchema>;

export const CreateMyHrWorkLogInputSchema = UpsertHrWorkLogInputSchema.omit({
  employeeId: true,
});
export type CreateMyHrWorkLogInput = z.infer<typeof CreateMyHrWorkLogInputSchema>;

export const HrSalarySlipView = z.object({
  id: EntityId,
  employeeId: EntityId,
  employeeName: z.string(),
  periodMonth: LeaveDateString,
  workingDays: z.number().int().min(0),
  leaveDays: z.number().int().min(0),
  basicPaise: HrMoneyPaise,
  hraPaise: HrMoneyPaise,
  specialAllowancePaise: HrMoneyPaise,
  grossPaise: HrMoneyPaise,
  dailyAllowancePaise: HrMoneyPaise,
  petrolAllowancePaise: HrMoneyPaise,
  mobileAllowancePaise: HrMoneyPaise,
  approvedExpensePaise: HrMoneyPaise,
  bonusPaise: HrMoneyPaise,
  deductionPaise: HrMoneyPaise,
  netPayPaise: HrMoneyPaise,
  transactionDate: LeaveDateString.nullable(),
  transactionReference: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: IsoDateString,
  updatedAt: IsoDateString,
});
export type HrSalarySlipView = z.infer<typeof HrSalarySlipView>;

export const GenerateHrSalarySlipInputSchema = z.object({
  employeeId: EntityId,
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/, { message: 'Use YYYY-MM month format.' }),
  bonusPaise: HrMoneyPaise.default(0),
  transactionDate: LeaveDateString.optional().nullable(),
  transactionReference: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});
export type GenerateHrSalarySlipInput = z.infer<typeof GenerateHrSalarySlipInputSchema>;

export const GenerateHrSalarySlipResponse = z.object({
  salarySlip: HrSalarySlipView,
});
export type GenerateHrSalarySlipResponse = z.infer<typeof GenerateHrSalarySlipResponse>;

export const EmployeeSalarySlipDownloadResponse = z.object({
  salarySlip: HrSalarySlipView,
  fileName: z.string(),
  contentType: z.literal('application/pdf'),
  contentBase64: z.string(),
});
export type EmployeeSalarySlipDownloadResponse = z.infer<typeof EmployeeSalarySlipDownloadResponse>;

export const EmployeeExpenseSlipDownloadResponse = z.object({
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/),
  summary: HrExpenseAllowanceSummaryView,
  fileName: z.string(),
  contentType: z.literal('application/pdf'),
  contentBase64: z.string(),
});
export type EmployeeExpenseSlipDownloadResponse = z.infer<
  typeof EmployeeExpenseSlipDownloadResponse
>;

export const HrDashboardView = z.object({
  records: z.array(HrEmployeeRecordView),
  documents: z.array(HrDocumentView),
  salarySlips: z.array(HrSalarySlipView),
  expenses: z.array(HrExpenseView),
  workLogs: z.array(HrWorkLogView),
  leaveRequests: z.array(EmployeeLeaveRequestView),
});
export type HrDashboardView = z.infer<typeof HrDashboardView>;
