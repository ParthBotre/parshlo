# Load tests

[k6](https://k6.io/) scripts that exercise the Parshlo API under production-like
concurrency. Two scenarios are provided:

1. **`catalog-read.js`** — public catalog scan with a peak of 1,000 concurrent
   virtual users, ramping to 10,000 over 5 minutes. Verifies the public read
   path is fast and stateless.
2. **`order-placement.js`** — authenticated buyer flow that places real B2B
   orders. Uses a pool of seeded buyer tokens (issued in `dev` auth mode) and
   uniformly random products + quantities.

## SLOs encoded in the scripts

| Scenario        | p95 latency | error rate |
| --------------- | ----------- | ---------- |
| Catalog read    | < 250 ms    | < 0.1 %    |
| Order placement | < 600 ms    | < 0.5 %    |

The thresholds cause the script to exit with a non-zero status when SLOs are
breached, so this doubles as CI gate.

## Running

```bash
# Install k6 once: brew install k6 (or see https://k6.io/docs/get-started/installation/)

# Smoke (1 VU, 1 minute)
make load-smoke

# Stress (ramps to 10k VUs)
API_BASE_URL=https://staging-api.parshlo.com make load-stress
```

> Run against staging, never directly against prod.
