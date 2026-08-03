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
  associatedPoNumber: z.string().trim().nullable().optional(),
  associatedOrderNumber: z.string().trim().nullable().optional(),
});
export type CreateConsignmentInput = z.infer<typeof CreateConsignmentSchema>;

export const UpdateConsignmentSchema = z.object({
  courierId: z.string().cuid().optional(),
  type: AdminLogisticsTypeEnum.optional(),
  docketNumber: z.string().min(2).trim().optional(),
  consignmentDate: z.coerce.date().optional(),
  amountPaise: z
    .union([z.bigint(), z.number().int()])
    .transform((v) => BigInt(v))
    .optional(),
  weightKg: z.number().positive().nullable().optional(),
  boxCount: z.number().int().positive().optional(),
  associatedPoNumber: z.string().trim().nullable().optional(),
  associatedOrderNumber: z.string().trim().nullable().optional(),
});
export type UpdateConsignmentInput = z.infer<typeof UpdateConsignmentSchema>;

export const CreateMonthlyStatementSchema = z.object({
  courierId: z.string().cuid(),
  statementInvoiceNumber: z.string().min(2).trim(),
  billingPeriodStart: z.coerce.date(),
  billingPeriodEnd: z.coerce.date(),
  courierChargedTotalPaise: z.coerce.bigint(),
});
export type CreateMonthlyStatementInput = z.infer<typeof CreateMonthlyStatementSchema>;

export const UpdateMonthlyStatementSchema = z.object({
  courierId: z.string().cuid().optional(),
  statementInvoiceNumber: z.string().min(2).trim().optional(),
  billingPeriodStart: z.coerce.date().optional(),
  billingPeriodEnd: z.coerce.date().optional(),
  courierChargedTotalPaise: z.coerce.bigint().optional(),
});
export type UpdateMonthlyStatementInput = z.infer<typeof UpdateMonthlyStatementSchema>;

export const CreateCourierPartnerSchema = z.object({
  name: z.string().min(1).trim(),
  websiteUrl: z.string().trim().url().optional().nullable(),
});
export type CreateCourierPartnerInput = z.infer<typeof CreateCourierPartnerSchema>;

export const UpdateCourierPartnerSchema = z.object({
  name: z.string().min(1).trim().optional(),
  websiteUrl: z.string().trim().url().optional().nullable(),
  isActive: z.boolean().optional(),
});
export type UpdateCourierPartnerInput = z.infer<typeof UpdateCourierPartnerSchema>;
