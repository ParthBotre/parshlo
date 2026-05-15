export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  cookieSecret: string;
  cors: {
    allowedOrigins: string[];
  };
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  auth0: {
    domain: string;
    audience: string;
    issuer: string;
  };
  aws: {
    region: string;
    s3: {
      kycBucket: string;
      invoicesBucket: string;
      endpoint: string | undefined;
    };
  };
  email: {
    resendApiKey: string | undefined;
    from: string;
    replyTo: string | undefined;
  };
  swagger: {
    enabled: boolean;
  };
}

function parseNodeEnv(value: string | undefined): AppConfig['nodeEnv'] {
  if (value === 'production' || value === 'test') {
    return value;
  }
  return 'development';
}

export const configuration = (): AppConfig => ({
  nodeEnv: parseNodeEnv(process.env.NODE_ENV),
  port: Number.parseInt(process.env.PORT ?? '4000', 10),
  cookieSecret: process.env.AUTH0_SECRET ?? 'dev-cookie-secret-change-me',
  cors: {
    allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },
  auth0: {
    domain: process.env.AUTH0_DOMAIN ?? '',
    audience: process.env.AUTH0_AUDIENCE ?? '',
    issuer: process.env.AUTH0_ISSUER_BASE_URL ?? `https://${process.env.AUTH0_DOMAIN ?? ''}/`,
  },
  aws: {
    region: process.env.AWS_REGION ?? 'ap-south-1',
    s3: {
      kycBucket: process.env.S3_BUCKET_KYC ?? 'parshlo-kyc-dev',
      invoicesBucket: process.env.S3_BUCKET_INVOICES ?? 'parshlo-invoices-dev',
      endpoint: process.env.S3_ENDPOINT,
    },
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM ?? 'Parshlo <no-reply@parshlo.local>',
    replyTo: process.env.EMAIL_REPLY_TO,
  },
  swagger: {
    enabled: process.env.NODE_ENV !== 'production',
  },
});
