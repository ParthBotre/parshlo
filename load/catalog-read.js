import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

/**
 * Catalog read load test.
 *
 * Ramps from 100 -> 10,000 concurrent VUs over 5 minutes, holds 2 minutes
 * at peak, then ramps down. SLO: p95 < 250ms, error rate < 0.1%.
 */

const API_BASE_URL = __ENV.API_BASE_URL || 'http://localhost:4000';

const catalogDuration = new Trend('catalog_duration_ms');

export const options = {
  stages: __ENV.SMOKE
    ? [{ duration: '30s', target: 5 }]
    : [
        { duration: '1m', target: 100 },
        { duration: '2m', target: 1_000 },
        { duration: '2m', target: 10_000 },
        { duration: '2m', target: 10_000 },
        { duration: '1m', target: 0 },
      ],
  thresholds: {
    http_req_failed: ['rate<0.001'],
    http_req_duration: ['p(95)<250', 'p(99)<500'],
    catalog_duration_ms: ['p(95)<250'],
  },
};

export default function () {
  const res = http.get(`${API_BASE_URL}/v1/products/public`, {
    tags: { name: 'catalog' },
  });
  catalogDuration.add(res.timings.duration);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has products array': (r) => Array.isArray(r.json()),
  });
  sleep(Math.random() * 0.5 + 0.5);
}
