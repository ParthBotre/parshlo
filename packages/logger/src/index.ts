import { pino, type Logger, type LoggerOptions } from 'pino';

/**
 * Fields that must NEVER appear in logs. Pino's redact handles dot-paths and
 * wildcards. Keep this conservative and add cases as the schema grows.
 */
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["set-cookie"]',
  'req.headers["x-api-key"]',
  'res.headers["set-cookie"]',
  '*.password',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.secret',
  '*.apiKey',
  '*.creditCard',
  // KYC PII — log only IDs, never raw documents
  '*.gstin',
  '*.pan',
  '*.drugLicenseNumber',
  '*.pharmacyRegistrationNumber',
  '*.mobile',
];

export interface CreateLoggerOptions {
  /** Service name embedded in every log line. */
  service: string;
  /** Log level (default: env LOG_LEVEL or "info"). */
  level?: string;
  /** Force pretty output even in non-dev (default: based on NODE_ENV). */
  pretty?: boolean;
}

export function createLogger(opts: CreateLoggerOptions): Logger {
  const isDev = process.env.NODE_ENV !== 'production';
  const pretty = opts.pretty ?? isDev;

  const baseOptions: LoggerOptions = {
    name: opts.service,
    level: opts.level ?? process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
    base: {
      service: opts.service,
      env: process.env.NODE_ENV ?? 'development',
      // Containers / k8s pods inject HOSTNAME
      host: process.env.HOSTNAME,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: REDACT_PATHS,
      censor: '[REDACTED]',
    },
    formatters: {
      level: (label) => ({ level: label }),
    },
  };

  if (pretty) {
    return pino({
      ...baseOptions,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
          ignore: 'pid,hostname,service,env,host',
          singleLine: false,
        },
      },
    });
  }

  return pino(baseOptions);
}

export type { Logger } from 'pino';
