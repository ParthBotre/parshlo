import { z } from 'zod';

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
    AUTH_DEV_SECRET: z.string().optional(),
    AUTH0_DOMAIN: z.string().optional(),
    AUTH0_AUDIENCE: z.string().optional(),
    AUTH0_ISSUER_BASE_URL: z.string().url().optional(),
    AUTH0_SECRET: z
      .string()
      .min(32, 'AUTH0_SECRET must be ≥ 32 chars (use `openssl rand -hex 32`)')
      .optional(),
    CORS_ALLOWED_ORIGINS: z.string().min(1),
    AWS_REGION: z.string().default('ap-south-1'),
    S3_BUCKET_KYC: z.string().min(1),
    S3_BUCKET_INVOICES: z.string().min(1),
    S3_ENDPOINT: z.string().url().optional(),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default('Parshlo <no-reply@parshlo.local>'),
    INVOICE_GENERATION_ENABLED: z.enum(['true', 'false']).default('false'),
  })
  .superRefine((env, ctx) => {
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
  });

export type ValidatedEnv = z.infer<typeof configValidationSchema>;
