# Runbook — Incident Response

## Severity definitions

| Sev | Example | Response time |
| --- | --- | --- |
| **SEV-1** | Site down, data breach suspected, order ingestion failing | < 15 min |
| **SEV-2** | Major feature broken (KYC submission, payments), elevated error rate | < 1 hour |
| **SEV-3** | Minor degradation, single endpoint slow | < 4 hours (business) |
| **SEV-4** | Cosmetic, single-user reports | next business day |

## First 10 minutes (SEV-1 / SEV-2)

1. **Acknowledge** the page / alert in the on-call channel within 5 minutes.
2. **Declare** an incident in `#incidents` with a fresh thread. Assign:
   - Incident commander
   - Communications lead
   - Engineering lead
3. **Check status pages** and dashboards in order:
   - APM dashboard
   - Sentry error feed (filter: last 30 min)
   - Auth0 status, AWS health, Cloudflare status
4. **Mitigate first, root-cause later.** If a recent deploy is suspected, **roll back immediately** — do not pause to diagnose.
5. **Communicate** every 15 minutes to stakeholders even with "no update".

## Common scenarios

### A. Elevated 5xx on `/v1/orders`

- Check Sentry for the top error.
- Inspect Postgres: `pg_stat_activity` for long-running queries, locks on `Order`/`Inventory`.
- If a serializable conflict storm: temporarily lower order-placement throughput via throttler; investigate.

### B. Auth0 outage

- All `/v1/*` (auth required) endpoints return 401/503.
- Mitigation: enable degraded-read mode (planned feature flag) — public catalog + read-only buyer dashboard.
- Monitor Auth0 status, communicate ETA.

### C. KYC document upload failing

- Confirm S3 / LocalStack reachable.
- Check IAM permissions on the upload role.
- Confirm content-type/length policy on presigned URL matches client request.

### D. Suspected data breach

- Page Security on-call immediately.
- Freeze deployments.
- Rotate Auth0 application secrets, AWS keys, database passwords (in this order).
- Preserve logs (CloudWatch + Postgres `AuditLog`) — do not delete or rotate retention.
- Engage external counsel per the incident playbook.

## Post-incident

Within 72 hours of resolution, the incident commander writes a blameless postmortem covering:

- Timeline
- Root cause
- Impact (users, money, time-to-detect, time-to-mitigate)
- Action items (owners + due dates)
- What went well / what to improve

Postmortems live in `docs/postmortems/YYYY-MM-DD-<slug>.md`.
