import * as Sentry from '@sentry/nextjs';

function readSampleRate(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
}

function isBrowserExtensionFrame(filename: string | undefined): boolean {
  if (!filename) {
    return false;
  }
  return filename.startsWith('chrome-extension://') || filename.startsWith('moz-extension://');
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
    process.env.NEXT_PUBLIC_VERCEL_ENV ??
    process.env.NODE_ENV,
  tracesSampleRate: readSampleRate(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE, 0.1),
  sendDefaultPii: false,
  denyUrls: [/^chrome-extension:\/\//, /^moz-extension:\/\//],
  ignoreErrors: [
    'No Listener: tabs:outgoing.message.ready',
    'The message port closed before a response was received',
    'ResizeObserver loop completed with undelivered notifications',
    'ResizeObserver loop limit exceeded',
  ],
  beforeSend(event) {
    const frames =
      event.exception?.values?.flatMap((value) => value.stacktrace?.frames ?? []) ?? [];
    if (frames.some((frame) => isBrowserExtensionFrame(frame.filename))) {
      return null;
    }
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
