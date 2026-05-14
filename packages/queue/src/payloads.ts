import { z } from 'zod';

/**
 * Job payload contracts. Producer (apps/api) and consumer (apps/worker)
 * both parse with these schemas at the boundary, so accidental shape drift
 * causes an immediate runtime failure in the queue instead of silently
 * propagating to email/invoice generation.
 */

// ----- Email jobs -----

export const EmailKind = z.enum([
  'ORDER_PLACED_BUYER',
  'ORDER_PLACED_ADMIN',
  'KYC_APPROVED',
  'KYC_REJECTED',
  'ORDER_STATUS_CHANGED',
]);
export type EmailKind = z.infer<typeof EmailKind>;

export const SendEmailJob = z.object({
  kind: EmailKind,
  to: z.string().email().or(z.array(z.string().email()).min(1)),
  /** Optional override of the default template subject. */
  subjectOverride: z.string().optional(),
  /** Arbitrary template data; validated per-kind inside the worker. */
  data: z.record(z.unknown()),
});
export type SendEmailJob = z.infer<typeof SendEmailJob>;

// ----- Invoice jobs -----

export const GenerateInvoiceJob = z.object({
  orderId: z.string().uuid(),
});
export type GenerateInvoiceJob = z.infer<typeof GenerateInvoiceJob>;

// ----- KYC notifications -----

export const KycDecisionJob = z.object({
  applicationId: z.string().uuid(),
  decision: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().max(2000).optional(),
});
export type KycDecisionJob = z.infer<typeof KycDecisionJob>;
