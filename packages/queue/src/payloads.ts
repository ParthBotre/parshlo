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
  'LEAVE_REQUEST_CREATED',
  'LEAVE_REQUEST_APPROVED',
  'LEAVE_REQUEST_REJECTED',
  'HR_DOCUMENT_READY',
]);
export type EmailKind = z.infer<typeof EmailKind>;

export const EmailAttachment = z.object({
  filename: z.string().min(1).max(240),
  content: z.string().min(1),
  contentType: z.string().min(1).max(120).optional(),
});
export type EmailAttachment = z.infer<typeof EmailAttachment>;

export const SendEmailJob = z.object({
  kind: EmailKind,
  to: z.string().email().or(z.array(z.string().email()).min(1)),
  cc: z.array(z.string().email()).min(1).optional(),
  bcc: z.array(z.string().email()).min(1).optional(),
  /** Optional override of the default template subject. */
  subjectOverride: z.string().optional(),
  /** Optional reply-to override for confidential HR messages. */
  replyTo: z.string().email().optional(),
  attachments: z.array(EmailAttachment).max(5).optional(),
  /** Arbitrary template data; validated per-kind inside the worker. */
  data: z.record(z.unknown()),
});
export type SendEmailJob = z.infer<typeof SendEmailJob>;

// ----- Invoice jobs -----

/** DB-issued id (cuid). Kept as a generic non-empty string so id strategy can evolve. */
const EntityId = z.string().min(1).max(128);

export const GenerateInvoiceJob = z.object({
  orderId: EntityId,
});
export type GenerateInvoiceJob = z.infer<typeof GenerateInvoiceJob>;

// ----- KYC notifications -----

export const KycDecisionJob = z.object({
  applicationId: EntityId,
  decision: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().max(2000).optional(),
});
export type KycDecisionJob = z.infer<typeof KycDecisionJob>;
