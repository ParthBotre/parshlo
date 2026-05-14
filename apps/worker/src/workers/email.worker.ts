import { type PrismaClient } from '@parshlo/db';
import { logger } from '@parshlo/logger';
import { QUEUE_EMAIL, SendEmailJob } from '@parshlo/queue';
import { Worker } from 'bullmq';
import { type Redis } from 'ioredis';

import { config } from '../config.js';
import { createEmailTransport, type EmailTransport } from '../email/transport.js';
import {
  renderKycApproved,
  renderKycRejected,
  renderOrderPlacedAdmin,
  renderOrderPlacedBuyer,
} from '../email/templates.js';

export function createEmailWorker({
  connection,
  prisma,
  transport,
}: {
  connection: Redis;
  prisma: PrismaClient;
  transport?: EmailTransport;
}): Worker {
  const send = transport ?? createEmailTransport();

  return new Worker(
    QUEUE_EMAIL,
    async (job) => {
      const data = SendEmailJob.parse(job.data);
      const log = logger.child({ queue: QUEUE_EMAIL, jobId: job.id, kind: data.kind });

      const rendered = (() => {
        switch (data.kind) {
          case 'ORDER_PLACED_BUYER':
            return renderOrderPlacedBuyer(data.data as Parameters<typeof renderOrderPlacedBuyer>[0]);
          case 'ORDER_PLACED_ADMIN':
            return renderOrderPlacedAdmin(data.data as Parameters<typeof renderOrderPlacedAdmin>[0]);
          case 'KYC_APPROVED':
            return renderKycApproved(data.data as Parameters<typeof renderKycApproved>[0]);
          case 'KYC_REJECTED':
            return renderKycRejected(data.data as Parameters<typeof renderKycRejected>[0]);
          case 'ORDER_STATUS_CHANGED':
            return {
              subject: data.subjectOverride ?? 'Order status updated',
              html: `<p>${JSON.stringify(data.data)}</p>`,
              text: JSON.stringify(data.data),
            };
        }
      })();

      await send.send({
        to: data.to,
        subject: data.subjectOverride ?? rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });

      // Write to NotificationLog if available (best-effort, never fails the job).
      try {
        await prisma.notificationLog.create({
          data: {
            channel: 'EMAIL',
            kind: data.kind,
            recipient: Array.isArray(data.to) ? data.to.join(',') : data.to,
            status: 'SENT',
            metadata: data.data as object,
          },
        });
      } catch (err) {
        log.warn({ err }, 'NotificationLog write failed');
      }

      log.info('email sent');
    },
    {
      connection,
      concurrency: config.WORKER_CONCURRENCY_EMAIL,
    },
  );
}
