import { z } from 'zod';

const BooleanFlag = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const Schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  EMAIL_TRANSPORT: z.enum(['mailhog', 'resend']).default('mailhog'),
  EMAIL_FROM: z.string().default('Parshlo <no-reply@parshlo.local>'),
  RESEND_API_KEY: z.string().optional(),
  MAILHOG_HOST: z.string().default('localhost'),
  MAILHOG_PORT: z.coerce.number().int().default(1025),
  AWS_REGION: z.string().default('ap-south-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().url().optional(),
  S3_BUCKET_INVOICES: z.string().default('parshlo-invoices-dev'),
  INVOICE_GENERATION_ENABLED: BooleanFlag,
  WORKER_CONCURRENCY_EMAIL: z.coerce.number().int().min(1).default(10),
  WORKER_CONCURRENCY_INVOICE: z.coerce.number().int().min(1).default(4),
  WORKER_CONCURRENCY_KYC: z.coerce.number().int().min(1).default(4),
});

export const config = Schema.parse(process.env);
export type WorkerConfig = z.infer<typeof Schema>;
