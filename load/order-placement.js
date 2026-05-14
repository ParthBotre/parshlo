import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

/**
 * Authenticated order placement load test.
 *
 * Expects a comma-separated list of bearer tokens in the BUYER_TOKENS env var
 * (issued via the web app's dev-login endpoint). Picks one randomly per VU,
 * fetches the buyer catalog once, then places a random order every 1-3
 * seconds. Each order uses a fresh UUID idempotency key.
 *
 * SLO: p95 < 600ms, error rate < 0.5%.
 */

const API_BASE_URL = __ENV.API_BASE_URL || 'http://localhost:4000';
const TOKENS = (__ENV.BUYER_TOKENS || '').split(',').filter(Boolean);

if (TOKENS.length === 0) {
  throw new Error('Set BUYER_TOKENS to a comma-separated list of buyer access tokens');
}

const ordersPlaced = new Counter('orders_placed');

export const options = {
  stages: __ENV.SMOKE
    ? [{ duration: '30s', target: 5 }]
    : [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 500 },
        { duration: '2m', target: 2_000 },
        { duration: '2m', target: 2_000 },
        { duration: '1m', target: 0 },
      ],
  thresholds: {
    http_req_failed: ['rate<0.005'],
    http_req_duration: ['p(95)<600', 'p(99)<1500'],
    orders_placed: ['count>500'],
  },
};

function uuid() {
  // RFC 4122 v4 — k6 has no crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export default function () {
  const token = TOKENS[Math.floor(Math.random() * TOKENS.length)];
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const cat = http.get(`${API_BASE_URL}/v1/products/catalog`, { headers });
  if (!check(cat, { 'catalog ok': (r) => r.status === 200 })) {
    return;
  }
  const products = cat.json();
  if (!Array.isArray(products) || products.length === 0) {
    return;
  }
  const product = products[Math.floor(Math.random() * products.length)];

  const idempotencyKey = uuid();
  const order = http.post(
    `${API_BASE_URL}/v1/orders`,
    JSON.stringify({
      items: [{ productId: product.id, quantity: product.moq }],
      purchaseOrderNumber: `LT-${idempotencyKey.slice(0, 8)}`,
      idempotencyKey,
    }),
    { headers: { ...headers, 'Idempotency-Key': idempotencyKey } },
  );

  const ok = check(order, {
    'order created or ok': (r) => r.status === 200 || r.status === 201,
  });
  if (ok) {
    ordersPlaced.add(1);
  }

  sleep(Math.random() * 2 + 1);
}
