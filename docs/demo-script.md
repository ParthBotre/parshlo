# Demo script (≈ 5 minutes)

Use this for a Loom recording or live walk-through. Assumes you've run:

```bash
make up && make db-migrate && make db-seed
pnpm dev
```

…and have the web app at `http://localhost:3000`, the API at `http://localhost:4000`.

## 1. The public site (45s)

1. Open `http://localhost:3000`.
2. Highlight the **landing hero** — point out the "Strictly B2B" badge.
3. Click into **Products** — note that prices are not visible (verified-only).
4. Click into a product detail page — explain that the public view is the
   marketing surface; the buyer view layered on top is fully separate.
5. Briefly open the **Contact** page — call out the Zod-validated form that
   actually hits the NestJS API.

## 2. Buyer journey (2 minutes)

1. Open **Sign in** → click **Continue as Demo Buyer** (dev-mode HS256 token
   gets signed and stored in an httpOnly cookie; in prod this is Auth0 + MFA).
2. Dashboard overview loads — stats are real, computed from the DB.
3. Open **Catalog** — wholesale prices, MOQ, GST, and live stock are now
   visible. Add a couple of products to the cart.
4. Open the cart drawer, review quantities, add an optional note if needed, and **Place order**.
5. Land on the order detail page — show the **state machine progress bar**.
6. Open the terminal to point out structured API logs and `NotificationLog`
   rows for workflows that will later connect to email/browser notifications.
7. Email, invoice PDF, and object-storage delivery are deferred unless the
   local worker/storage flags are intentionally enabled.

## 3. Admin journey (1m 30s)

1. Sign out and back in as **Continue as Demo Admin**.
2. **Analytics** — real counts (pending KYC, approved buyers, orders this
   month, gross paise).
3. **KYC Queue** — click **Approve** on a row → instant DB update + KYC
   notification queued via BullMQ.
4. **Orders** — click around the status filter tabs.
5. **Buyers** — show the registered businesses with KYC status badges.
6. **Holidays** — submit a PTO request as an employee and approve/reject it as
   a super admin.

## 4. The engineering bits (1 minute)

1. Open `http://localhost:4000/docs` — full **Swagger / OpenAPI** schema with
   Zod-derived types.
2. Open `http://localhost:4000/metrics` — Prometheus exposition with custom
   histograms for HTTP + business counters (`parshlo_orders_placed_total`).
3. Open VS Code, point at:
   - `apps/api/src/modules/order/order.service.ts` — Serializable transaction,
     idempotency key, atomic inventory reservation, state-machine validation.
   - `packages/types/src/order.ts` — the Zod schema that's a single source
     of truth for API contract.
   - `apps/web/src/lib/api-client.ts` — boundary validation in the web app.
4. Show the `.github/workflows/ci.yml` — lint, typecheck, unit + integration
   tests, CodeQL, commitlint.
5. Show `infra/terraform/` — explain the three-environment layout with remote
   state and locking.

## Closing line

> "Two apps, four shared packages, sub-200ms p95 catalog reads under 10k
> concurrent VUs, end-to-end typed from Zod schema → DB → React. Built with
> the same patterns you'd see on a real B2B platform team."
