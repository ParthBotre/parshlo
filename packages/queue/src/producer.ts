import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

import { GenerateInvoiceJob, KycDecisionJob, SendEmailJob } from './payloads.js';
import { DEFAULT_JOB_OPTIONS, QUEUE_EMAIL, QUEUE_INVOICE, QUEUE_KYC } from './queues.js';

/**
 * Typed producer that the NestJS API uses to enqueue work.
 *
 * Validates every payload at the boundary so a typo in business code can't
 * push a malformed job onto Redis — fail fast in the caller.
 */
export class JobProducer {
  private readonly connection: Redis;
  private readonly email: Queue;
  private readonly invoice: Queue;
  private readonly kyc: Queue;

  constructor(redisUrl: string, connection?: Redis) {
    this.connection =
      connection ??
      new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
      });
    const opts = { connection: this.connection };
    this.email = new Queue(QUEUE_EMAIL, opts);
    this.invoice = new Queue(QUEUE_INVOICE, opts);
    this.kyc = new Queue(QUEUE_KYC, opts);
  }

  async enqueueEmail(payload: unknown, jobName = 'send'): Promise<void> {
    const data = SendEmailJob.parse(payload);
    await this.email.add(jobName, data, DEFAULT_JOB_OPTIONS);
  }

  async enqueueInvoice(payload: unknown): Promise<void> {
    const data = GenerateInvoiceJob.parse(payload);
    await this.invoice.add('generate', data, DEFAULT_JOB_OPTIONS);
  }

  async enqueueKycDecision(payload: unknown): Promise<void> {
    const data = KycDecisionJob.parse(payload);
    await this.kyc.add('decision', data, DEFAULT_JOB_OPTIONS);
  }

  async close(): Promise<void> {
    await Promise.allSettled([this.email.close(), this.invoice.close(), this.kyc.close()]);
    await this.connection.quit();
  }
}
