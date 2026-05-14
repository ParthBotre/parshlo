import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

/**
 * Singleton Prometheus registry + the common metrics every Parshlo service
 * exposes:
 *   - process / runtime metrics (default node collector)
 *   - HTTP request duration histogram (api)
 *   - Job duration histogram (worker)
 *
 * Services expose `/metrics` (api only) that serves `registry.metrics()`.
 */

export const registry = new Registry();

collectDefaultMetrics({ register: registry, prefix: 'parshlo_' });

export const httpRequestDuration = new Histogram({
  name: 'parshlo_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [registry],
});

export const httpRequestsTotal = new Counter({
  name: 'parshlo_http_requests_total',
  help: 'Total number of HTTP requests received',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [registry],
});

export const jobDuration = new Histogram({
  name: 'parshlo_job_duration_seconds',
  help: 'Background job duration in seconds',
  buckets: [0.1, 0.5, 1, 5, 15, 60],
  labelNames: ['queue', 'kind', 'outcome'] as const,
  registers: [registry],
});

export const ordersPlacedTotal = new Counter({
  name: 'parshlo_orders_placed_total',
  help: 'Total number of B2B orders successfully placed',
  registers: [registry],
});

export const kycDecisionsTotal = new Counter({
  name: 'parshlo_kyc_decisions_total',
  help: 'Total number of KYC decisions',
  labelNames: ['decision'] as const,
  registers: [registry],
});
