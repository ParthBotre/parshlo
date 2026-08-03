# Parshlo Codebase Handover

Last updated: 2026-06-19

This document is a practical handover for developers, operators, or future maintainers working on the Parshlo staging/production codebase. It explains how the major pieces fit together, where important code lives, and what to be careful about when changing or deploying the system.

## 1. System Overview

Parshlo is a B2B pharmaceutical ordering and internal operations platform.

The app has three main runtime surfaces:

- **Web app**: Next.js app hosted on Vercel.
- **API**: NestJS REST API running in Docker on the DigitalOcean droplet.
- **Worker**: Background job processor for email and queue-based work, also running in Docker on the droplet.

Supporting services:

- **PostgreSQL**: Primary application database.
- **Redis**: Queue/cache infrastructure.
- **Auth0**: Authentication and login.
- **Cloudflare**: DNS, proxying, email routing, and public domain management.
- **Caddy**: Reverse proxy on the droplet for the API domain.
- **Sentry**: Error monitoring for frontend/backend.
- **Resend**: Transactional email delivery.

High-level request flow:

```text
Browser
  -> Cloudflare
  -> Vercel Next.js web app
  -> staging-api.parshlo.com
  -> Caddy on droplet
  -> NestJS API container
  -> Postgres / Redis

Background events
  -> API writes queue job / notification log
  -> Worker consumes Redis queue
  -> Resend sends email
```

## 2. Repository Layout

```text
apps/
  api/        NestJS backend API
  web/        Next.js frontend and server routes
  worker/     Background queue worker

packages/
  config/     Shared environment/config helpers
  db/         Prisma schema, migrations, generated client helpers
  logger/     Shared logging
  queue/      BullMQ/Redis queue helpers
  telemetry/  Sentry/observability helpers
  types/      Shared Zod schemas and TypeScript contracts

infra/
  docker/     Dockerfiles for API and worker

docs/
  Architecture, deployment, reports, and handover docs
```

## 3. Core Apps

### Web App

Location: `apps/web`

The web app is a Next.js App Router project. It handles:

- Public marketing/catalog pages.
- Auth0 login/logout and session handling.
- Employee/admin dashboards.
- Buyer/product/order UI.
- HR pages for salary slips, expenses, work reporting, and documents.
- Next server routes that proxy or shape requests to the backend API.

Important areas:

- `apps/web/src/app/admin`: Admin and super-admin pages.
- `apps/web/src/app/dashboard`: Employee-facing pages.
- `apps/web/src/app/products`: Public/product browsing pages.
- `apps/web/src/components`: Shared UI components.
- `apps/web/src/lib/api`: API client wrappers.
- `apps/web/src/lib`: Shared frontend utilities.

Common admin routes:

- `/admin`
- `/admin/orders`
- `/admin/place-order`
- `/admin/products`
- `/admin/buyers`
- `/admin/finance/logistics`
- `/admin/hr`
- `/admin/analytics/gross`

Common employee routes:

- `/dashboard`
- `/dashboard/reports`
- `/dashboard/expenses`
- `/dashboard/salary-slips`

### API

Location: `apps/api`

The API is a NestJS service. It owns business logic, authorization checks, database writes, and most data shaping.

Important areas:

- `apps/api/src/modules/admin`: Admin, HR, order management, product management, buyer management.
- `apps/api/src/modules/user`: Employee/dashboard-facing operations.
- `apps/api/src/modules/product`: Public and internal catalog APIs.
- `apps/api/src/modules/order`: Order placement and order lifecycle.
- `apps/api/src/modules/finance-logistics`: Courier partners, consignments, statements, reconciliation.
- `apps/api/src/modules/auth`: Auth0/dev JWT verification.
- `apps/api/src/modules/health`: Health and readiness checks.

API routes are generally under `/v1`.

### Worker

Location: `apps/worker`

The worker consumes background jobs from Redis. It is used for:

- Email notifications.
- Resend delivery.
- Queue-based operational tasks.
- Future document/email/background jobs.

The worker must be deployed separately from the API. If email-related code changes, rebuild and restart `parshlo-worker` on the droplet.

## 4. Shared Packages

### `packages/types`

This is the shared contract layer. It contains Zod schemas and exported TypeScript types used by both API and web.

When adding or changing API payloads:

1. Update the schema in `packages/types`.
2. Build the package.
3. Update API validation/logic.
4. Update web API client and UI.

Do not duplicate request/response shapes manually if a shared schema already exists.

### `packages/db`

This package contains Prisma:

- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations`
- database client helpers

Database changes must be made with migrations. For staging/prod, do not rely on `seed.ts` to update real data. Use migrations or explicit admin tooling/scripts that are reviewed.

Money values are stored in paise, generally as integer/bigint fields. Avoid floating point for persisted prices/totals.

### `packages/queue`

Shared queue names and BullMQ helpers. Used by API and worker.

### `packages/telemetry`

Sentry and telemetry setup. The web, API, and worker can each send errors to Sentry.

### `packages/config`

Shared environment parsing/config helpers.

## 5. Authentication And Roles

Auth is handled through Auth0. The backend validates bearer tokens and maps users to database records.

Important roles:

- `SALES_MANAGER`
- `ADMIN`
- `SUPER_ADMIN`
- `BUYER`

Current product direction:

- Internal staff use the employee/admin dashboards.
- HR pages are strictly super-admin-only.
- Employee permissions are separate from HR records.
- Super admins can see and manage everything.
- Employees must not see other employees' expenses, salary slips, or private HR data.

When adding a new page or API endpoint, check both:

- Frontend navigation visibility.
- Backend authorization.

Do not rely only on hiding UI links.

## 6. Product And Catalog Logic

Products are managed in the database and displayed through the catalog/admin UI.

Key concepts:

- Public product pages can hide restricted products.
- Product categories may exist but should not be treated as reliable display filters unless intentionally fixed.
- Prices use rate tiers.
- Rate A is currently for stockist-type pricing.
- Rate B is currently for chemist-type pricing.
- Approved/historical orders preserve price snapshots. Be careful when changing product pricing logic: catalog updates should not silently rewrite historical order totals.

Product image handling is frontend-public-file based unless replaced later by object storage:

- Public images generally live under `apps/web/public`.
- Product records or frontend mapping determine which image displays.

## 7. Orders

Orders are one of the most sensitive workflows.

Important behavior:

- Order item prices and quantities are snapshotted.
- Paid quantity and free quantity are separate.
- Super admins can edit eligible orders according to the current order status rules.
- CSV exports use order/date/product snapshot data.
- Internal order notifications go to staff/admin routing, not buyers.
- The buyer-facing email flow should stay disabled unless explicitly reintroduced.

Be careful with:

- Order status transitions.
- Approved/dispatched order edit rules.
- Price tier changes on existing orders.
- Product quantity edits.
- CSV export formatting.
- Mobile cart/order layouts.

## 8. Buyers

Buyer data is stored through `User` plus `BusinessProfile`.

Important behavior:

- GST can be real GST or system-managed unregistered IDs.
- If a buyer has no GST, the system should assign/maintain an `UNREGISTERED-*` value rather than forcing staff to invent one manually.
- PIN code is intended to be optional.
- Buyer lists should be searchable and alphabetically usable.

When editing buyer validation, check:

- Shared Zod schema in `packages/types`.
- API update/create logic.
- Admin web forms.
- Employee place-order buyer search.

## 9. Logistics

Logistics lives mostly in:

- `apps/api/src/modules/finance-logistics`
- `apps/web/src/app/admin/finance/logistics`

Core pieces:

- Courier partners.
- Courier partner website/tracking URL where available.
- Consignment logs.
- Courier statements.
- Reconciliation/matching between consignments and statements.
- Incoming/outgoing direction labels.

Operational notes:

- Shipment amount is not the same as order amount.
- If shipment amount is unknown, it should remain blank/zero as designed, not default to order total.
- Admin/super-admin controls can add/edit courier partners.
- Orders should use the same courier partner list as logistics.

## 10. HR, Salary, Expenses, Work Reports

HR is super-admin-only. Employee-facing salary slips, expenses, and work reports are separate from super-admin HR management.

Important HR concepts:

- HR employee records are connected to employee permission/users where possible.
- Employee permissions should remain in the employee permissions page.
- HR records store employee details used for offer letters, appointment letters, increment letters, salary slips, and expense slips.
- HR records should be archived rather than destructively deleted.

HR document generation:

- Offer letter.
- Appointment letter.
- Increment letter.
- Salary slip.
- Expense slip.

Documents use the company letterhead/template assets in the repo. If the letterhead changes, replace the stored template asset and verify generated PDFs visually before pushing.

Important privacy rules:

- HR page is super-admin-only.
- Employees can see only their own salary slips, expenses, and work reports.
- Super admins can approve/reject expenses and manage salary/payment details.
- Appointment/offer/increment emails should reply to `superadmin@parshlo.com`, not the shared company inbox.

Salary slip behavior:

- Super admin creates/saves monthly salary slip/payment details.
- Employee can download only saved salary slips.
- Month/year selection should be dropdown-based, not raw typing.
- Dates should display in Indian format: `DD/MM/YYYY`.

Expense behavior:

- Standard allowance is calculated from work reports and configured allowance amounts.
- Daily allowance is currently based on worked days.
- Mobile and petrol allowances are included as configured.
- Extra expenses are submitted by employees and require super-admin review.
- Expense slips should be generated separately from salary slips.

Work reports:

- Employees submit daily work reports.
- Current counters include ORTH, MD, GP, GYN, Others, total doctors, and total chemists.
- Approved holidays should block or subtract from work/allowance calculations.
- Super admin needs monthly/weekly/yearly visibility and analytics.

Company holidays:

- Super admins can manage editable company holidays by fiscal year.
- Company holidays are separate from PTO/leave balances.

## 11. Email And Notifications

Email delivery uses:

- Resend for sending.
- Cloudflare Email Routing for aliases like `admin@parshlo.com` and `superadmin@parshlo.com`.
- Worker queue for async sending.
- `NotificationLog` in the database for tracking notification attempts.

Important environment variables:

- `EMAIL_NOTIFICATIONS_ENABLED`
- `EMAIL_TRANSPORT`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `EMAIL_FROM_DEFAULT`
- `EMAIL_FROM_ORDERS`
- `EMAIL_FROM_HOLIDAYS`
- `EMAIL_REPLY_TO`
- `ADMIN_NOTIFICATION_EMAIL`
- `LEAVE_NOTIFICATION_EMAIL`
- `WEB_BASE_URL`

Operational notes:

- Order notifications should go to internal/admin recipients.
- Holiday notifications should go to super admins.
- Buyer emails should not be sent for employee-only portal flows.
- Reply-to for HR private documents should use `superadmin@parshlo.com`.
- Worker logs show email job success/failure.

Useful checks on the droplet:

```bash
docker logs --tail=100 parshlo-worker

docker exec -i parshlo-postgres psql -U parshlo -d parshlo -c \
"SELECT kind, recipient, status, \"createdAt\", metadata
 FROM \"NotificationLog\"
 ORDER BY \"createdAt\" DESC
 LIMIT 20;"
```

## 12. Deployment Model

### Web

The web app deploys through Vercel from the `staging` branch for staging.

Vercel build usually runs:

```bash
pnpm --filter @parshlo/types build && pnpm build
```

If Vercel fails on a type error, fix and push again. Do not assume local IDE warnings are harmless.

### API And Worker

The droplet runs Docker containers:

- `parshlo-api`
- `parshlo-worker`
- `parshlo-postgres`
- `parshlo-redis`

Common staging deploy flow:

```bash
ssh root@168.144.68.124
cd /opt/parshlo
git pull origin staging

docker build -f infra/docker/api.Dockerfile -t parshlo-api:staging .

docker run --rm \
  --env-file /opt/parshlo/api.staging.env \
  --network parshlo_default \
  --entrypoint sh \
  parshlo-api:staging \
  -lc "cd /app && ./packages/db/node_modules/.bin/prisma migrate deploy --schema packages/db/prisma/schema.prisma"

docker rm -f parshlo-api
docker run -d \
  --name parshlo-api \
  --restart unless-stopped \
  --env-file /opt/parshlo/api.staging.env \
  --network parshlo_default \
  -p 127.0.0.1:4000:4000 \
  parshlo-api:staging

sleep 10
docker ps
curl http://127.0.0.1:4000/v1/health
curl http://127.0.0.1:4000/v1/health/ready
curl https://staging-api.parshlo.com/v1/health
```

If worker code changed:

```bash
cd /opt/parshlo
docker build -f infra/docker/worker.Dockerfile -t parshlo-worker:staging .

docker rm -f parshlo-worker
docker run -d \
  --name parshlo-worker \
  --restart unless-stopped \
  --env-file /opt/parshlo/api.staging.env \
  --network parshlo_default \
  parshlo-worker:staging

sleep 5
docker ps
docker logs --tail=80 parshlo-worker
```

## 13. Docker Storage

The staging droplet is small, so Docker storage can fill during builds.

Safe cleanup commands used on staging:

```bash
docker system df
docker builder prune -af
docker image prune -af
docker container prune -f
df -h
docker system df
```

Do not run `docker volume prune` unless there is a verified backup and an explicit plan. Volumes can contain database data.

## 14. Database Rules

Database changes must be forward-only and migration-based.

Checklist for DB changes:

1. Update `packages/db/prisma/schema.prisma`.
2. Add a migration under `packages/db/prisma/migrations`.
3. Run `pnpm --filter @parshlo/db build`.
4. Run API/web builds if generated types are consumed.
5. On droplet, run `prisma migrate deploy` before restarting the API if the new code needs the new schema.

Avoid:

- Destructive deletes.
- Truncating staging/prod data without a backup.
- Editing existing applied migrations.
- Using seed scripts for staging/prod data correction.

## 15. Local Development

Requirements:

- Node.js 22+
- pnpm 9+
- Docker, if running local Postgres/Redis

Common commands:

```bash
pnpm install
pnpm --filter @parshlo/db build
pnpm --filter @parshlo/types build
pnpm --filter @parshlo/api build
pnpm --filter @parshlo/web build
pnpm --filter @parshlo/api lint
pnpm --filter @parshlo/web lint
pnpm --filter @parshlo/types lint
```

For local infra:

```bash
make up
make down
```

Before committing:

```bash
git status --short
git diff --check
pnpm --filter @parshlo/types build
pnpm --filter @parshlo/api build
pnpm --filter @parshlo/web build
pnpm --filter @parshlo/api lint
pnpm --filter @parshlo/web lint
```

## 16. Frontend UI Notes

The app is heavily used on mobile by employees. For admin tables and operational pages:

- Wide tables should be inside a horizontal scroll container.
- Avoid hidden overflow that traps columns off-screen.
- Do not force tiny text to fit all columns on mobile.
- Sidebar navigation must stay usable on small screens.
- Forms should use dropdowns/month pickers where possible, not raw text date/month input.
- Display dates in `DD/MM/YYYY` for Indian users.

## 17. Monitoring And Debugging

Sentry:

- Captures web/API/worker errors.
- Environment should be `staging` for staging and `production` for production.
- Production should eventually use separate projects or clearly separated service tags for web/API/worker.

Health checks:

```bash
curl http://127.0.0.1:4000/v1/health
curl http://127.0.0.1:4000/v1/health/ready
curl https://staging-api.parshlo.com/v1/health
```

Docker:

```bash
docker ps
docker logs --tail=100 parshlo-api
docker logs --tail=100 parshlo-worker
docker system df
df -h
```

Common browser console noise from extensions is not always app-owned. Errors mentioning extension scripts, `runtime.sendMessage`, or tab messaging often come from browser extensions unless Sentry confirms the app path and stack.

## 18. High-Risk Areas

Be extra careful when touching:

- Order totals, order item snapshots, and price tiers.
- Product catalog visibility.
- Buyer GST/unregistered logic.
- HR salary/expense/private employee data.
- Email recipient routing.
- Logistics reconciliation.
- Prisma migrations.
- Mobile table/layout behavior.

For these areas, run both build checks and a quick manual browser test.

## 19. Production Readiness Notes

Before final production launch:

- Confirm production database cluster connection string.
- Confirm production Auth0 tenant/app settings.
- Set production Sentry DSNs and `SENTRY_ENVIRONMENT=production`.
- Confirm Resend/domain email routing.
- Confirm backups for production database.
- Confirm object/document storage plan if generated PDFs become long-term artifacts.
- Confirm that staging-only env values are not copied into production.
- Run migrations against production only after a backup and release plan.

## 20. Practical Change Checklist

For a typical feature:

1. Identify whether it touches web, API, worker, DB, or shared types.
2. Update `packages/types` first if API payloads change.
3. Update Prisma schema and migration if persisted data changes.
4. Implement API authorization and business rules.
5. Implement web UI and API client calls.
6. Update worker/email logic if async notifications are involved.
7. Run builds/lints for affected packages.
8. Check mobile layouts for operational pages.
9. Push to `staging`.
10. Deploy API/worker on droplet if backend/worker changed.
11. Verify health checks and relevant user flow.
