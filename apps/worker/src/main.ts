import { startOtel, startSentry } from '@parshlo/telemetry';

startOtel({ serviceName: 'parshlo-worker' });
startSentry({});

import { logger } from '@parshlo/logger';
import IORedis from 'ioredis';

import { config } from './config.js';
import { prisma } from './db.js';
import { S3Client, createS3Client } from './s3.js';
import { createEmailWorker } from './workers/email.worker.js';
import { createInvoiceWorker } from './workers/invoice.worker.js';
import { createKycWorker } from './workers/kyc.worker.js';

async function main(): Promise<void> {
  logger.info('Worker booting…');

  const connection = new IORedis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  const s3: S3Client = createS3Client();

  const workers = [
    createEmailWorker({ connection, prisma }),
    createInvoiceWorker({ connection, prisma, s3 }),
    createKycWorker({ connection, prisma }),
  ];

  workers.forEach((w) => {
    w.on('completed', (job) => {
      logger.info({ queue: w.name, jobId: job.id }, 'job completed');
    });
    w.on('failed', (job, err) => {
      logger.error({ queue: w.name, jobId: job?.id, err: err.message }, 'job failed');
    });
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'worker shutting down');
    await Promise.allSettled(workers.map((w) => w.close()));
    await connection.quit();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  logger.info('Worker ready · queues: email, invoice, kyc');
}

main().catch((err: unknown) => {
  logger.error({ err }, 'worker bootstrap failed');
  process.exit(1);
});
