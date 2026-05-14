/** Centralized queue identifiers — single source of truth for routing.
 *  NOTE: BullMQ rejects ':' in queue names (it's used as a Redis key separator),
 *  so we use '-' delimiters. The queueing prefix can still namespace these in Redis. */
export const QUEUE_EMAIL = 'parshlo-email';
export const QUEUE_INVOICE = 'parshlo-invoice';
export const QUEUE_KYC = 'parshlo-kyc';

export const QUEUES = [QUEUE_EMAIL, QUEUE_INVOICE, QUEUE_KYC] as const;
export type QueueName = (typeof QUEUES)[number];

export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 2_000 },
  removeOnComplete: { age: 24 * 3600, count: 1_000 },
  removeOnFail: { age: 30 * 24 * 3600 },
} as const;
