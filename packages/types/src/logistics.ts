import { z } from 'zod';

export const AdminLogisticsTypeEnum = z.enum(['INCOMING', 'OUTGOING']);
export type AdminLogisticsType = z.infer<typeof AdminLogisticsTypeEnum>;

export const AuditMatchStatusEnum = z.enum([
  'UNBILLED',
  'MATCHED',
  'DISCREPANCY',
  'MANUALLY_RESOLVED',
]);

export const AdminStatementStatusEnum = z.enum(['UNRECONCILED', 'RECONCILED', 'FLAGGED', 'PAID']);

export const CreateConsignmentSchema = z.object({
  courierId: z.string().cuid(),
  type: AdminLogisticsTypeEnum,
  docketNumber: z.string().min(2).trim(),
  consignmentDate: z.coerce.date(),
  amountPaise: z.union([z.bigint(), z.number().int()]).transform((v) => BigInt(v)),
  weightKg: z.number().positive().optional(),
  boxCount: z.number().int().positive().default(1),
  associatedPoNumber: z.string().optional(),
  associatedOrderNumber: z.string().optional(),
});
export type CreateConsignmentInput = z.infer<typeof CreateConsignmentSchema>;

export const CreateMonthlyStatementSchema = z.object({
  courierId: z.string().cuid(),
  statementInvoiceNumber: z.string().min(2).trim(),
  billingPeriodStart: z.coerce.date(),
  billingPeriodEnd: z.coerce.date(),
  courierChargedTotalPaise: z.coerce.bigint(),
});
export type CreateMonthlyStatementInput = z.infer<typeof CreateMonthlyStatementSchema>;

export const CreateCourierPartnerSchema = z.object({
  name: z.string().min(1).trim(),
});
export type CreateCourierPartnerInput = z.infer<typeof CreateCourierPartnerSchema>;
