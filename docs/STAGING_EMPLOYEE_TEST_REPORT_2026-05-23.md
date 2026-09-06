# Parshlo Staging Employee Test Report

Date: May 23, 2026

This report summarizes how the current staging environment was brought online, what is ready for employee testing, what safety controls are in place, and what should happen before production launch.

## Staging URLs

| Surface         | URL                                         | Status                                      |
| --------------- | ------------------------------------------- | ------------------------------------------- |
| Staging website | `https://staging.parshlo.com`               | Live behind Cloudflare Access OTP           |
| Staging API     | `https://staging-api.parshlo.com/v1/health` | Live and returning `200 OK`                 |
| API root        | `https://staging-api.parshlo.com/`          | Expected `404`; API routes live under `/v1` |

## Current Architecture

Staging is running as:

- Web frontend on Vercel, currently deployed from the `staging` branch.
- API on a DigitalOcean Ubuntu droplet.
- PostgreSQL 16 as a Docker container on the same droplet.
- Redis 7 as a Docker container on the same droplet.
- Caddy on the droplet as the HTTPS reverse proxy from `staging-api.parshlo.com` to the API container on `127.0.0.1:4000`.
- Cloudflare DNS and proxy in front of both staging domains.
- Cloudflare Access OTP protecting `staging.parshlo.com`.
- Auth0 staging tenant/application used for login.
- Sentry staging project available for backend error reporting when `SENTRY_DSN` is set.

## Backend Status

The staging API was verified with:

```bash
curl http://127.0.0.1:4000/v1/health
curl http://127.0.0.1:4000/v1/health/ready
curl https://staging-api.parshlo.com/v1/health
```

Expected result:

```json
{ "status": "ok" }
```

Readiness also verifies database connectivity:

```json
{ "status": "ok", "checks": { "database": "ok" } }
```

Docker status was verified as healthy:

```text
parshlo-api      127.0.0.1:4000->4000/tcp   healthy
parshlo-postgres 127.0.0.1:5432->5432/tcp   healthy
parshlo-redis    127.0.0.1:6379->6379/tcp   healthy
```

## Security Changes Completed

The following staging safety fixes were completed:

- API container now resolves monorepo workspace packages correctly in production runtime.
- Dev auth verifier no longer crashes staging/prod startup when `AUTH_MODE=auth0`.
- API Docker healthcheck now uses `/v1/health`, matching API versioning.
- Postgres and Redis are bound to `127.0.0.1` instead of public `0.0.0.0`.
- Public API traffic goes through Cloudflare and Caddy over HTTPS.
- Staging website is protected by Cloudflare Access OTP before Auth0 login.
- Auth0 app login succeeds for the staging tenant.
- Prisma migrations were applied with `migrate deploy`; destructive seed/reset was not run.

## Database Setup Completed

The staging database was initialized with Prisma migrations only:

```bash
prisma migrate deploy
```

No destructive seed was run.

The first staging super admin was bootstrapped manually:

```text
email: parthbotre.51@gmail.com
role: SUPER_ADMIN
accountStatus: APPROVED
```

Courier partner baseline records were inserted with a non-destructive upsert and are now also captured in a migration:

- Professional Couriers
- Tej Couriers
- Mark Couriers
- SHIPKART
- VISHWA COURIERS

## Code Changes Made During Staging Bring-Up

The following staging branch fixes were made:

| Commit    | Purpose                                                          |
| --------- | ---------------------------------------------------------------- |
| `d9bf240` | Preserve API pnpm runtime layout inside Docker                   |
| `76df07f` | Disable dev verifier outside dev auth mode                       |
| `29cbd26` | Avoid dev auth startup crash without requiring `AUTH_DEV_SECRET` |
| `ce70826` | Use versioned `/v1/health` Docker healthcheck                    |
| `9e21860` | Bind local data services to localhost                            |

Additional migration added after manual courier verification:

- `20260523150000_baseline_courier_partners`

## Employee Testing Plan

Give employees access for one week through:

1. Cloudflare Access OTP for `https://staging.parshlo.com`.
2. Auth0 sign-in using their staging account email.
3. Parshlo employee creation/role assignment from the `/admin/employees` page.

Employee emails in Auth0 must match the email entered in Parshlo admin.

Recommended roles:

- `SALES_MANAGER`: place orders and assist buyers.
- `ADMIN`: approve/reject orders, update order status, manage logistics.
- `SUPER_ADMIN`: employee management and owner-level controls only.

## What Employees Should Test

Employees should test the real workflows, not just page loading:

- Sign in and sign out.
- Direct access protection for `/admin`.
- Add buyer from admin/manager flow.
- Buyer list and buyer detail pages.
- Place order as staff.
- Manager-created order going under review.
- Admin approval and rejection flow.
- Order status flow: placed, under review, approved, preparing, dispatched.
- Edit order before approval where allowed.
- Product browsing and product details.
- Product admin add/edit/disable flow.
- CSV download.
- Sales analytics filters.
- Logistics courier partner filtering.
- Log consignment.
- Reconcile monthly statement.
- Statement discrepancy handling.
- Mobile layout, especially input zoom and overflow.

## Feedback Collection

Ask testers to report every issue with:

- Page URL.
- Role used.
- What they clicked.
- Expected behavior.
- Actual behavior.
- Screenshot or screen recording if possible.
- Approximate time of the issue.

The approximate time matters because API logs and Sentry events can be searched around that timestamp.

## Known Expected Behaviors

- `https://staging-api.parshlo.com/` returns `404`. This is expected because the API root has no homepage.
- Health is at `https://staging-api.parshlo.com/v1/health`.
- Storage/S3 uploads are intentionally disabled for now.
- Email notifications and invoice generation are intentionally disabled for now.
- Do not run `pnpm --filter @parshlo/db seed` against staging.
- Do not run `migrate reset`, `db reset`, or any reset command against staging.

## Pre-Production Checklist After Employee Testing

Before promoting to production:

- Fix reported bugs on staging branch.
- Re-test the exact flows employees reported.
- Confirm product catalog has the expected product count and active statuses.
- Confirm all intended courier partners exist.
- Confirm super admin, admin, and manager roles behave correctly.
- Confirm buyers cannot access admin APIs.
- Confirm direct URL access is blocked for wrong roles.
- Confirm order ownership checks for buyer-facing pages.
- Confirm logs and Sentry capture backend failures.
- Confirm production Auth0, Vercel, API, database, and Redis are separate from staging.
- Confirm production database has paid backups enabled.
- Take a production backup before every migration.

## Production Promotion Plan

After staging sign-off:

1. Merge the tested staging commit into `main`.
2. Configure production environment variables separately.
3. Run production migrations with `prisma migrate deploy`.
4. Deploy API and web from `main`.
5. Bootstrap only the first production `SUPER_ADMIN`.
6. Add employees through `/admin/employees`.
7. Add or activate products through `/admin/products`.
8. Monitor Sentry, API logs, and user feedback during launch.

Production should never be created by running the development seed file.
