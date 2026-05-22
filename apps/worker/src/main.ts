/* eslint-disable import/order --
   dotenv/config must run before our config module reads env vars, and
   OpenTelemetry auto-instrumentation requires startOtel() to execute BEFORE
   any other instrumented module is imported. Those interleaved side-effect
   blocks intentionally violate strict import grouping. */
import 'dotenv/config';

import { startOtel, startSentry } from '@parshlo/telemetry';

startOtel({ serviceName: 'parshlo-worker' });
startSentry({});

import { logger } from '@parshlo/logger';
import { Redis } from 'ioredis';

import { config } from './config.js';
import { prisma } from './db.js';
import { createS3Client } from './s3.js';
import { createEmailWorker } from './workers/email.worker.js';
import { createInvoiceWorker } from './workers/invoice.worker.js';
import { createKycWorker } from './workers/kyc.worker.js';
/* eslint-enable import/order */

function main(): void {
  logger.info('Worker booting…');

  const connection = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  const workers = [
    createEmailWorker({ connection, prisma }),
    ...(config.INVOICE_GENERATION_ENABLED
      ? [createInvoiceWorker({ connection, prisma, s3: createS3Client() })]
      : []),
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
    // Graceful shutdown completed; exit cleanly so the orchestrator records
    // a successful termination rather than restarting the pod.
    // eslint-disable-next-line no-process-exit
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  logger.info(
    { invoiceGenerationEnabled: config.INVOICE_GENERATION_ENABLED },
    config.INVOICE_GENERATION_ENABLED
      ? 'Worker ready · queues: email, invoice, kyc'
      : 'Worker ready · queues: email, kyc',
  );
}

try {
  main();
} catch (err: unknown) {
  logger.error({ err }, 'worker bootstrap failed');
  // Bootstrap failures are unrecoverable — exit non-zero so k8s / pm2 restarts.
  // eslint-disable-next-line no-process-exit
  process.exit(1);
}
