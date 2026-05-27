import { PutObjectCommand } from '@aws-sdk/client-s3';
import { type PrismaClient } from '@parshlo/db';
import { logger } from '@parshlo/logger';
import { GenerateInvoiceJob, QUEUE_INVOICE } from '@parshlo/queue';
import { Worker } from 'bullmq';
import { type Redis } from 'ioredis';

import { config } from '../config.js';
import { renderInvoicePdf } from '../invoice/render-pdf.js';
import { type S3Client } from '../s3.js';

export function createInvoiceWorker({
  connection,
  prisma,
  s3,
}: {
  connection: Redis;
  prisma: PrismaClient;
  s3: S3Client;
}): Worker {
  return new Worker(
    QUEUE_INVOICE,
    async (job) => {
      const { orderId } = GenerateInvoiceJob.parse(job.data);
      const log = logger.child({ queue: QUEUE_INVOICE, jobId: job.id, orderId });

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          buyer: { include: { businessProfile: true } },
        },
      });
      if (!order || !order.buyer.businessProfile) {
        throw new Error(`Order ${orderId} not found or missing business profile`);
      }

      // Idempotency: skip if invoice already archived for this order.
      const existing = await prisma.invoice.findUnique({ where: { orderId } });
      if (existing) {
        log.info('invoice already generated, skipping');
        return;
      }

      const invoiceNumber = await nextInvoiceNumber(prisma);
      const bp = order.buyer.businessProfile;

      const { bytes, sha256 } = await renderInvoicePdf({
        orderNumber: order.orderNumber,
        invoiceNumber,
        placedAt: order.placedAt,
        seller: {
          name: 'Parshlo',
          gstin: '27AAACP9999P1Z5',
          addressLines: ['Tower 1, Marol Industrial Estate', 'Andheri East, Mumbai 400059'],
          state: 'MH',
        },
        buyer: {
          businessName: bp.businessName,
          gstin: bp.gstin,
          addressLines: [
            bp.addressLine1,
            bp.addressLine2 ?? '',
            [bp.city, bp.pin].filter(Boolean).join(' '),
          ].filter(Boolean),
          state: bp.state,
        },
        items: order.items.map((i) => ({
          productName: i.productNameSnapshot,
          quantity: i.quantity,
          unitPricePaise: Number(i.unitPricePaise),
          gstRate: gstRateLabel(i.gstRate),
          lineSubtotalPaise: Number(i.lineSubtotalPaise),
          lineGstPaise: Number(i.lineGstPaise),
          lineTotalPaise: Number(i.lineTotalPaise),
        })),
        subtotalPaise: Number(order.subtotalPaise),
        gstPaise: Number(order.gstPaise),
        totalPaise: Number(order.totalPaise),
      });

      const key = `invoices/${order.placedAt.getFullYear()}/${invoiceNumber}.pdf`;
      await s3.send(
        new PutObjectCommand({
          Bucket: config.S3_BUCKET_INVOICES,
          Key: key,
          Body: bytes,
          ContentType: 'application/pdf',
          ContentDisposition: `attachment; filename="${invoiceNumber}.pdf"`,
          Metadata: { sha256, orderId, invoiceNumber },
        }),
      );

      await prisma.invoice.create({
        data: {
          orderId,
          invoiceNumber,
          s3Bucket: config.S3_BUCKET_INVOICES,
          s3Key: key,
          sha256,
          totalPaise: order.totalPaise,
        },
      });

      log.info({ invoiceNumber, key, sha256 }, 'invoice archived to S3');
    },
    {
      connection,
      concurrency: config.WORKER_CONCURRENCY_INVOICE,
    },
  );
}

function gstRateLabel(g: 'ZERO' | 'FIVE' | 'TWELVE' | 'EIGHTEEN' | 'TWENTYEIGHT'): string {
  const m = { ZERO: '0', FIVE: '5', TWELVE: '12', EIGHTEEN: '18', TWENTYEIGHT: '28' } as const;
  return m[g];
}

async function nextInvoiceNumber(prisma: PrismaClient): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.invoice.count({
    where: { invoiceNumber: { startsWith: `PSH-INV-${String(year)}-` } },
  });
  return `PSH-INV-${String(year)}-${String(count + 1).padStart(6, '0')}`;
}
