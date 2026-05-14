import * as Sentry from '@sentry/node';

export interface SentryInitOptions {
  dsn?: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
}

/**
 * Initialize Sentry. No-op when no DSN is configured, so local dev / tests
 * never accidentally send events.
 */
export function startSentry(opts: SentryInitOptions = {}): void {
  const dsn = opts.dsn ?? process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }
  Sentry.init({
    dsn,
    environment: opts.environment ?? process.env.NODE_ENV ?? 'development',
    release: opts.release ?? process.env.SERVICE_VERSION,
    tracesSampleRate:
      opts.tracesSampleRate ??
      Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
  });
}

export { Sentry };
