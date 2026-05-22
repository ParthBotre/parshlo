import { z } from 'zod';

const optionalNonEmptyString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional(),
);

const optionalUrl = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().url().optional(),
);

const optionalSecret = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(32, 'AUTH0_SECRET must be ≥ 32 chars (use `openssl rand -hex 32`)').optional(),
);

/**
 * Validate the raw process.env at boot. Anything missing will fail-fast so
 * we never accidentally start without critical config in prod.
 */
export const configValidationSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().default(4000),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    AUTH_MODE: z.enum(['auth0', 'dev']).default('auth0'),
    AUTH_DEV_SECRET: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().optional(),
    ),
    AUTH0_DOMAIN: optionalNonEmptyString,
    AUTH0_AUDIENCE: optionalNonEmptyString,
    AUTH0_ISSUER_BASE_URL: optionalUrl,
    AUTH0_SECRET: optionalSecret,
    CORS_ALLOWED_ORIGINS: z.string().min(1),
    AWS_REGION: z.string().default('ap-south-1'),
    S3_BUCKET_KYC: optionalNonEmptyString,
    S3_BUCKET_INVOICES: optionalNonEmptyString,
    S3_ENDPOINT: optionalUrl,
    RESEND_API_KEY: optionalNonEmptyString,
    EMAIL_FROM: z.string().default('Parshlo <no-reply@parshlo.local>'),
    EMAIL_NOTIFICATIONS_ENABLED: z.enum(['true', 'false']).default('false'),
    INVOICE_GENERATION_ENABLED: z.enum(['true', 'false']).default('false'),
    STORAGE_ENABLED: z.enum(['true', 'false']).default('false'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.AUTH_MODE === 'dev') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AUTH_MODE'],
        message: 'AUTH_MODE=dev is not allowed when NODE_ENV=production',
      });
    }
    if (env.AUTH_MODE === 'auth0') {
      const required: (keyof typeof env)[] = [
        'AUTH0_DOMAIN',
        'AUTH0_AUDIENCE',
        'AUTH0_ISSUER_BASE_URL',
        'AUTH0_SECRET',
      ];
      for (const key of required) {
        if (!env[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${String(key)} is required when AUTH_MODE=auth0`,
          });
        }
      }
    }
    if (env.AUTH_MODE === 'dev' && (!env.AUTH_DEV_SECRET || env.AUTH_DEV_SECRET.length < 32)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AUTH_DEV_SECRET'],
        message: 'AUTH_DEV_SECRET (≥32 chars) is required when AUTH_MODE=dev',
      });
    }
    if (env.STORAGE_ENABLED === 'true') {
      for (const key of ['S3_BUCKET_KYC', 'S3_BUCKET_INVOICES'] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required when STORAGE_ENABLED=true`,
          });
        }
      }
    }
  });

export type ValidatedEnv = z.infer<typeof configValidationSchema>;
