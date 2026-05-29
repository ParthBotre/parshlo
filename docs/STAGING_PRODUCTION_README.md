# Parshlo Staging + Production Operations

This is the operating guide for taking Parshlo from local development to employee staging and then production without losing live data.

## Environment Model

Use three separate environments. Never share databases between them.

| Environment | Purpose                                | Database rule                             | Seed rule                                    |
| ----------- | -------------------------------------- | ----------------------------------------- | -------------------------------------------- |
| Dev         | Local coding and experiments           | Can reset freely                          | `make db-seed` is allowed                    |
| Staging     | Employee/company testing before launch | Do not casually reset after testers begin | Bootstrap only, then manage through admin UI |
| Production  | Real business records                  | Never reset                               | No demo seed                                 |

Production and staging must each have separate:

- Auth0 application/tenant settings
- Web/API services
- Postgres database
- Redis instance
- S3/R2 bucket only if uploads are intentionally enabled later
- Email sender credentials only if notifications are intentionally enabled later
- Sentry/logging project

## Current Deployment Decision

For the first staging/prod rollout, run Parshlo as a data-only order and admin system:

- Auth0: use separate Auth0 accounts/tenants for staging and production.
- Web: Vercel Hobby is acceptable for the first rollout; upgrade before you need team controls, higher bandwidth, or stronger production support.
- API: deploy one NestJS API service per environment.
- Database: use isolated Postgres databases. Production should be a paid managed Postgres plan with backups.
- Redis: keep one isolated Redis per environment for rate limiting and queues.
- Storage/S3: disabled for now. Set `STORAGE_ENABLED=false` and do not set AWS credentials.
- Email: disabled for now. Set `EMAIL_NOTIFICATIONS_ENABLED=false` and do not deploy the worker just for email.
- Invoice generation: disabled for now. Set `INVOICE_GENERATION_ENABLED=false`.

Product photos currently live as static web assets in `apps/web/public/product-images`. Adding a new product photo after launch means committing the image file and deploying the web app. It does not require reseeding the database.

## Database Safety Rules

Use migrations for schema changes:

```bash
pnpm --filter @parshlo/db migrate
```

This runs `prisma migrate deploy`, which is the production-safe Prisma command.

Do not run these against staging or production:

```bash
make db-reset
pnpm --filter @parshlo/db migrate:reset
pnpm --filter @parshlo/db seed
```

The repo now has guardrails:

- `packages/db/prisma/seed.ts` refuses staging/production-looking environments.
- `scripts/guard-dev-db.mjs` blocks seed/reset against non-local database hosts.
- `make db-reset` remains local-only and guarded.
- `AUTH_MODE=dev` is rejected when `NODE_ENV=production`, so dev login cannot boot in staging/prod-style builds.

If a real environment needs initial data, create a small one-time bootstrap migration/script that only inserts non-demo required records and review it before running.

## Backups

Do not run production on a database plan without backups.

Minimum production setup:

- Managed Postgres paid tier with automatic backups and point-in-time recovery.
- Daily logical backup with `pg_dump`.
- Backup before every migration.
- Monthly restore drill into staging.
- Separate app runtime and migration database credentials.

Manual backup:

```bash
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges --file backups/prod-$(date +%Y%m%d-%H%M%S).dump
```

Restore into staging/test only:

```bash
pg_restore --clean --if-exists --no-owner --dbname "$STAGING_DATABASE_URL" backups/prod-YYYYMMDD-HHMMSS.dump
```

Never restore over production unless this is an approved incident rollback.

## Users, Employees, And Roles

Auth0 proves identity. The Parshlo database grants application access.

Initial staging/production owner account: bootstrap `parthbotre.51@gmail.com` as the first `SUPER_ADMIN`.

Roles:

- `BUYER`: verified B2B buyer
- `SALES_MANAGER`: staff order placement and read access
- `ADMIN`: order approval/status/logistics/product management
- `SUPER_ADMIN`: employee role management and break-glass ownership

To add an employee after launch:

1. Create/invite the person in Auth0.
2. In Parshlo admin, go to `/admin/employees`.
3. Add their email, name, and role.
4. They sign in with Auth0 using the same email.
5. The API links the Auth0 subject to the existing DB user on first login.

To remove an employee:

1. Suspend the employee in `/admin/employees`.
2. Disable/remove their Auth0 account.
3. Keep the DB user for audit history.

Do not hard-delete users with orders, KYC reviews, approvals, or audit events.

## Employee Holidays / PTO

Internal employees manage PTO from `/admin/holidays`.

Current rules:

- Every employee role (`SALES_MANAGER`, `ADMIN`, `SUPER_ADMIN`) receives 30 PTO days per calendar year.
- Employees choose a start date and end date from date inputs and submit a leave request.
- Pending and approved requests reduce the displayed available balance.
- Overlapping pending/approved requests are rejected.
- Requests must stay inside one calendar year.
- Only `SUPER_ADMIN` users can approve or reject requests.
- Approval/rejection keeps reviewer, review time, and optional note.

Notification foundation:

- Creating a request writes `NotificationLog.kind = leave.request.created`.
- Approving writes `NotificationLog.kind = leave.request.approved`.
- Rejecting writes `NotificationLog.kind = leave.request.rejected`.
- These rows are intentionally queued as `status = PENDING` so a later email worker/provider can send internal emails without changing the PTO workflow.

Deploy note: this feature requires the `20260528143000_employee_leave_requests` Prisma migration before the page can work against staging/production API.

## Buyers

Buyers are created through registration or admin/manager-created buyer forms. A buyer should be allowed to order only when:

- `roles` includes `BUYER`
- `accountStatus` is `APPROVED`
- Business/KYC details are complete enough for invoices and compliance

To disable a buyer, suspend the account rather than deleting it. Their historical orders must remain readable.

## Products

Do not edit seed files after launch to manage live products.

Use `/admin/products`:

- Add new SKUs as `DRAFT`.
- Verify product name, HSN, GST display rate, MRP, Rate A/PTS, Rate B/PTR, packaging, and description.
- Switch to `ACTIVE` after approval.
- Use `DISABLED` to remove a product from ordering without damaging old orders.

Orders snapshot product name and unit price, so old orders remain valid even after product prices change.

Product images are separate from product rows. To add or change a product image without touching live data:

1. Add the image under `apps/web/public/product-images`.
2. Link the image path from the product admin page or product metadata.
3. Deploy the web/API change through staging first.
4. Do not run seed/reset against production.

To retire a product, set it to `DISABLED`; do not delete it if it appears on historical orders.

## Required Runtime Flags

Use these defaults in staging and production until the deferred systems are deliberately launched:

```bash
NODE_ENV=production
APP_ENV=staging # use APP_ENV=production in production
AUTH_MODE=auth0
STORAGE_ENABLED=false
EMAIL_NOTIFICATIONS_ENABLED=false
INVOICE_GENERATION_ENABLED=false
```

When `STORAGE_ENABLED=false`, upload/download endpoints return `STORAGE_DISABLED` and the API does not require S3 bucket names. When storage is launched later, set `STORAGE_ENABLED=true`, provide private bucket names, configure AWS/R2 credentials outside GitHub, and retest upload type/size/path controls.

When `EMAIL_NOTIFICATIONS_ENABLED=false`, the API will not enqueue order or KYC notification emails. Leave `WORKER_DEPLOY_HOOK_URL` empty unless you intentionally deploy the worker for KYC/email/invoice jobs.

Never use dummy AWS, email, database, or Auth0 production secrets. Missing services should be explicitly disabled through feature flags.

## Staging Flow

1. Create a `staging` branch or deploy staging from selected commits.
2. Configure GitHub Environment `staging`.
3. Add staging secrets:
   - `DATABASE_URL`
   - `WEB_DEPLOY_HOOK_URL`
   - `API_DEPLOY_HOOK_URL`
   - Leave `WORKER_DEPLOY_HOOK_URL` empty while email/invoice worker deployment is deferred
   - provider-specific app secrets outside GitHub as needed
4. Deploy with GitHub Actions: `deploy` workflow → `staging`.
5. Run smoke tests:
   - Auth0 login/logout
   - Admin direct URL protection
   - Buyer direct URL protection
   - Place order
   - Manager order requires admin approval
   - Admin approval/status transitions
   - Holiday request submit + super-admin approve/reject
   - Product add/disable
   - Employee suspend/update role
   - Logistics admin-only controls
6. Let employees test with staging accounts.
7. Fix bugs through PRs and redeploy staging.
8. Promote the exact reviewed commit to production.

## Production Deploy Flow

1. Merge approved work to `main`.
2. Confirm CI is green.
3. Trigger GitHub Actions `deploy` workflow with `production`.
4. The workflow:
   - installs dependencies
   - runs lint, typecheck, tests, audit, build
   - takes a `pg_dump` backup artifact
   - runs Prisma migrations
   - triggers configured deploy hooks; worker deploy is skipped unless `WORKER_DEPLOY_HOOK_URL` is set
5. Smoke test production.
6. Watch logs, Sentry, API errors, and queue failures.

## Current Staging Droplet Deploy Flow

The current staging API runs as a Docker container on the droplet, while the web frontend deploys from Vercel.

For API/backend changes:

```bash
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
curl http://127.0.0.1:4000/v1/health
curl http://127.0.0.1:4000/v1/health/ready
curl https://staging-api.parshlo.com/v1/health
```

Important:

- Run migrations before restarting into code that expects new tables/columns.
- A first curl immediately after container start can fail while Nest is still booting; wait a few seconds and retry.
- `https://staging-api.parshlo.com/` returning 404 is normal because the API root is not a website. Use `/v1/health`.
- If Docker reports no space left on device, check `df -h` and `docker system df`; prune stopped containers and unused images, but do not remove Postgres volumes.

## Shipping Updates After Launch

Use this process for every change:

1. Create a feature branch.
2. Make code changes and add/adjust migrations if schema changes.
3. Run locally:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit --prod
```

4. Open PR.
5. Deploy to staging.
6. Test with staging data.
7. Take or verify backup.
8. Deploy to production using the GitHub Actions deploy workflow.
9. Monitor for at least 30 minutes after release.

Never fix production by editing the database manually unless there is an approved incident and a backup exists.

## Low-Cost Hosting Recommendation

Use student credits for staging while you have them, but pick tools that remain affordable later.

Practical low-cost stack:

- Web: Vercel, Render, or Cloudflare Pages.
- API/worker: Render, Fly.io, Railway, or a small VPS.
- Postgres: cheapest paid Neon/Supabase/Render/Railway Postgres plan with backups.
- Redis: Upstash free/low tier.
- Storage: Cloudflare R2 or S3.
- Auth: Auth0 free tier while usage is low.
- Errors: Sentry free tier.
- Logs: provider logs first, then Better Stack/Axiom/Logtail when needed.

Avoid free Postgres for production if it has no backups.

## Error Logs And Future Bug Fixes

Yes, you should get production error logs if these are configured:

- API structured logs: already Pino/NestJS based.
- Request IDs: already generated by Fastify.
- Metrics: `/metrics` already exists for Prometheus-style scraping.
- Sentry: code hooks exist; set `SENTRY_DSN` in API/worker/web environments.
- Queue failure logs: worker logs failed jobs; connect them to centralized logging.

For bug reports, collect:

- user email or buyer business name
- approximate time
- page URL
- request ID if visible in logs
- screenshots
- affected order/product/buyer ID

## Security Checklist Status

Authorization:

- RBAC: implemented in backend guards and route decorators. Admin pages are also protected by middleware.
- Resource ownership: buyer order/KYC routes should continue to be reviewed before launch; admin routes use role checks.
- API endpoint authorization: most protected routes use `getSession()` on web route handlers and JWT/RBAC in API. Run a route-by-route review before final prod.

Observability:

- Structured logging: implemented through Pino.
- Timestamp: present in logs.
- Request ID: generated by Fastify and exposed through `X-Request-Id`.
- User ID: stored in audit logs; production request logs should be enhanced later to attach `userId` automatically to every authenticated request log.
- Log levels: implemented through Pino `LOG_LEVEL`.
- Central aggregation: not complete until you connect hosting logs/Sentry/Better Stack/Axiom.

Post-deployment audit:

- AI-generated and fast-built paths need a route-by-route security review before launch.
- Keep admin mutation routes audited.
- Test direct URL access manually in staging.
- Keep dependency audit blocking in CI.

## Current Pre-Launch Gaps To Keep Tracking

- Add a staging/prod restore drill after selecting the database provider.
- Decide final email provider and sender domain.
- Keep invoice generation disabled until invoice numbering and stakeholder rules are finalized.
- Add deeper E2E tests for role boundaries and ownership checks.
- Add centralized log aggregation before serious production traffic.
