import { type PrismaClient } from '@parshlo/db';
import { logger } from '@parshlo/logger';
import { KycDecisionJob, QUEUE_EMAIL, QUEUE_KYC } from '@parshlo/queue';
import { Queue, Worker } from 'bullmq';
import { type Redis } from 'ioredis';

import { config } from '../config.js';

export function createKycWorker({
  connection,
  prisma,
}: {
  connection: Redis;
  prisma: PrismaClient;
}): Worker {
  const emailQueue = new Queue(QUEUE_EMAIL, { connection });

  return new Worker(
    QUEUE_KYC,
    async (job) => {
      const data = KycDecisionJob.parse(job.data);
      const log = logger.child({
        queue: QUEUE_KYC,
        jobId: job.id,
        applicationId: data.applicationId,
      });

      const app = await prisma.kycApplication.findUnique({
        where: { id: data.applicationId },
        include: { user: { include: { businessProfile: true } } },
      });
      if (!app?.user) {
        throw new Error(`KYC application ${data.applicationId} or user missing`);
      }

      const businessName = app.user.businessProfile?.businessName ?? app.user.fullName;
      const buyerName = app.user.fullName.split(' ')[0] ?? app.user.fullName;
      const signInUrl = `${process.env.WEB_BASE_URL ?? 'http://localhost:3000'}/auth/sign-in`;

      await emailQueue.add(
        'send',
        {
          kind: data.decision === 'APPROVED' ? 'KYC_APPROVED' : 'KYC_REJECTED',
          to: app.user.email,
          data: { buyerName, businessName, signInUrl, reason: data.reason },
        },
        { attempts: 5, backoff: { type: 'exponential', delay: 2000 } },
      );

      log.info({ decision: data.decision }, 'kyc decision notification enqueued');
    },
    {
      connection,
      concurrency: config.WORKER_CONCURRENCY_KYC,
    },
  );
}
