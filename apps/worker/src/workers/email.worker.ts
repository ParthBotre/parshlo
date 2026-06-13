import { type PrismaClient } from '@parshlo/db';
import { logger } from '@parshlo/logger';
import { QUEUE_EMAIL, SendEmailJob } from '@parshlo/queue';
import { Worker } from 'bullmq';
import { type Redis } from 'ioredis';

import { config } from '../config.js';
import {
  type KycDecisionData,
  type HrDocumentReadyData,
  type LeaveRequestData,
  type OrderPlacedAdminData,
  type OrderPlacedBuyerData,
  renderKycApproved,
  renderKycRejected,
  renderHrDocumentReady,
  renderLeaveRequestCreated,
  renderLeaveRequestReviewed,
  renderOrderPlacedAdmin,
  renderOrderPlacedBuyer,
} from '../email/templates.js';
import { createEmailTransport, type EmailTransport } from '../email/transport.js';

function senderForKind(kind: SendEmailJob['kind']): string {
  if (kind.startsWith('ORDER_')) {
    return config.EMAIL_FROM_ORDERS ?? config.EMAIL_FROM_DEFAULT ?? config.EMAIL_FROM;
  }
  if (kind.startsWith('LEAVE_REQUEST_')) {
    return config.EMAIL_FROM_HOLIDAYS ?? config.EMAIL_FROM_DEFAULT ?? config.EMAIL_FROM;
  }
  return config.EMAIL_FROM_DEFAULT ?? config.EMAIL_FROM;
}

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
            return renderOrderPlacedBuyer(data.data as unknown as OrderPlacedBuyerData);
          case 'ORDER_PLACED_ADMIN':
            return renderOrderPlacedAdmin(data.data as unknown as OrderPlacedAdminData);
          case 'KYC_APPROVED':
            return renderKycApproved(data.data as unknown as KycDecisionData);
          case 'KYC_REJECTED':
            return renderKycRejected(data.data as unknown as KycDecisionData);
          case 'ORDER_STATUS_CHANGED':
            return {
              subject: data.subjectOverride ?? 'Order status updated',
              html: `<p>${JSON.stringify(data.data)}</p>`,
              text: JSON.stringify(data.data),
            };
          case 'LEAVE_REQUEST_CREATED':
            return renderLeaveRequestCreated(data.data as unknown as LeaveRequestData);
          case 'LEAVE_REQUEST_APPROVED':
          case 'LEAVE_REQUEST_REJECTED':
            return renderLeaveRequestReviewed(data.data as unknown as LeaveRequestData);
          case 'HR_DOCUMENT_READY':
            return renderHrDocumentReady(data.data as unknown as HrDocumentReadyData);
          default:
            return {
              subject: data.subjectOverride ?? 'Parshlo notification',
              html: `<p>${JSON.stringify(data.data)}</p>`,
              text: JSON.stringify(data.data),
            };
        }
      })();

      await send.send({
        to: data.to,
        cc: data.cc,
        bcc: data.bcc,
        from: senderForKind(data.kind),
        replyTo: data.replyTo ?? config.EMAIL_REPLY_TO,
        subject: data.subjectOverride ?? rendered.subject,
        html: rendered.html,
        text: rendered.text,
        attachments: data.attachments,
      });

      // Write to NotificationLog if available (best-effort, never fails the job).
      try {
        await prisma.notificationLog.create({
          data: {
            channel: 'EMAIL',
            kind: data.kind,
            recipient: Array.isArray(data.to) ? data.to.join(',') : data.to,
            status: 'SENT',
            metadata: { ...data.data, cc: data.cc ?? [], bcc: data.bcc ?? [] },
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
