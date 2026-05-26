import { type ThrottlerOptions } from '@nestjs/throttler';

/** Global tiers applied to every route unless overridden or skipped. */
export const GLOBAL_THROTTLE_TIERS: ThrottlerOptions[] = [
  { name: 'short', ttl: 1000, limit: 5 },
  { name: 'medium', ttl: 10_000, limit: 30 },
  { name: 'long', ttl: 60_000, limit: 120 },
];

/** Auth / registration surfaces. */
export const THROTTLE_AUTH: Record<string, ThrottlerOptions> = {
  short: { name: 'short', ttl: 60_000, limit: 10 },
};

/** Mutations: orders, KYC decisions, presigned uploads. */
export const THROTTLE_MUTATION: Record<string, ThrottlerOptions> = {
  medium: { name: 'medium', ttl: 60_000, limit: 20 },
};

/** Order placement — business-critical, tighter cap. */
export const THROTTLE_ORDER_PLACE: Record<string, ThrottlerOptions> = {
  medium: { name: 'medium', ttl: 60_000, limit: 10 },
};

/** Public catalog reads — allow browsing but deter scraping. */
export const THROTTLE_PUBLIC_READ: Record<string, ThrottlerOptions> = {
  long: { name: 'long', ttl: 60_000, limit: 180 },
};
