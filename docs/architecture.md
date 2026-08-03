# Architecture

This document walks through how Parshlo is put together today: the request flow, the data model, and the trust boundaries.

Current staging runs the web app on Vercel and the API on a DigitalOcean droplet behind Caddy. The worker, email sender, document storage, and Terraform AWS stack are present as foundations/plans, but they are not required for the current staging website.

## 1. High-level diagram

```mermaid
flowchart LR
  subgraph Browser
    Public[Public visitor]
    Buyer[Verified B2B buyer]
    Admin[Internal admin]
  end

  subgraph Edge
    CDN[Cloudflare<br/>DNS + proxy]
  end

  subgraph Frontend
    Web[Vercel<br/>apps/web<br/>Next.js 15]
  end

  subgraph Identity
    Auth0[Auth0 tenant<br/>MFA · post-login Action]
  end

  subgraph Backend
    Caddy[Caddy<br/>staging-api.parshlo.com]
    API[Droplet Docker<br/>apps/api<br/>NestJS + Fastify]
  end

  subgraph Data
    PG[(Postgres 16<br/>Docker)]
    Redis[(Redis 7<br/>Docker)]
  end

  subgraph 3rdParty
    Sentry[Sentry]
  end

  Public & Buyer & Admin -->|HTTPS| CDN --> Web
  Web -->|Bearer JWT| API
  Web -->|OIDC redirect| Auth0
  CDN --> Caddy --> API
  API -->|JWKS verify| Auth0
  API --> PG
  API --> Redis
  API & Web --> Sentry
```

## 2. Request lifecycle

### 2.1 Public catalog read

```mermaid
sequenceDiagram
  participant U as Browser
  participant W as Next.js (RSC)
  participant A as NestJS API
  participant D as Postgres
  U->>W: GET /products
  W->>A: GET /v1/products/public
  A->>D: SELECT (public, active)
  D-->>A: rows
  A-->>W: 200 JSON (no prices)
  W-->>U: HTML (server-rendered)
```

### 2.2 Verified buyer placing an order

```mermaid
sequenceDiagram
  participant U as Buyer
  participant W as Next.js
  participant Z as Auth0
  participant A as API
  participant D as Postgres
  U->>W: Login
  W->>Z: OIDC redirect
  Z-->>W: id_token + access_token
  U->>W: POST /v1/orders (with Idempotency-Key)
  W->>A: Bearer access_token
  A->>Z: JWKS verify
  A->>D: BEGIN SERIALIZABLE
  A->>D: SELECT products FOR UPDATE
  A->>D: validate MOQ / stock
  A->>D: INSERT order + items
  A->>D: UPDATE inventory.reservedQty
  A->>D: INSERT order_status_event
  A->>D: INSERT audit_log
  A->>D: COMMIT
  A-->>W: 201 OrderView
  W-->>U: confirmation page
```

## 3. Trust boundaries

| Boundary         | Trust direction          | Controls                                                         |
| ---------------- | ------------------------ | ---------------------------------------------------------------- |
| Browser → Web    | untrusted → semi-trusted | HTTPS, HSTS, CSP, XSS-safe RSC, CSRF-aware server routes         |
| Web → API        | semi-trusted → trusted   | Bearer JWT from Auth0, CORS allowlist, no credentials forwarding |
| API → DB         | trusted → trusted        | Connection pool, parameterized queries via Prisma                |
| API → Redis      | trusted → trusted        | Private Docker network in staging; private network in prod       |
| API → Auth0      | trusted → trusted        | JWKS over HTTPS, cached + rate-limited                           |
| API/Web → Sentry | trusted → SaaS           | DSNs only, environment tags, no secrets in event payloads        |

## 4. Data model summary

See the Prisma schema at `packages/db/prisma/schema.prisma`. Cardinality cheat sheet:

```mermaid
erDiagram
  USER ||--o{ KYC_APPLICATION : submits
  USER ||--o{ ORDER : places
  USER ||--o| BUSINESS_PROFILE : has
  KYC_APPLICATION ||--o{ KYC_DOCUMENT : contains
  PRODUCT ||--o| INVENTORY : has
  PRODUCT ||--o{ PRODUCT_BATCH : has
  PRODUCT_CATEGORY ||--o{ PRODUCT : contains
  ORDER ||--|{ ORDER_ITEM : has
  ORDER ||--o| INVOICE : has
  ORDER ||--o{ ORDER_STATUS_EVENT : transitions
  ORDER ||--o{ ADMIN_CONSIGNMENT_LOG : has
  COURIER ||--o{ ADMIN_CONSIGNMENT_LOG : handles
  COURIER ||--o{ COURIER_LEDGER_STATEMENT : reports
  USER ||--o{ EMPLOYEE_LEAVE_REQUEST : requests
  USER ||--o{ NOTIFICATION_LOG : receives
```

Key invariants:

- `BusinessProfile.gstin` is **globally unique**.
- An order is uniquely identified by `(buyerId, idempotencyKey)`.
- `OrderItem.productNameSnapshot` is immutable after creation so historical invoices remain accurate even if the product name changes.
- Approved order items keep their historical price snapshots; pre-approval order edits can recalculate current pricing.
- Employee leave requests count pending and approved days against the 30-day yearly allowance.
- Money is stored as `BigInt` paise; never as floats.

## 5. Where to add things

- **A new entity** → `packages/db/prisma/schema.prisma` + migration + `@parshlo/types` schema.
- **A new endpoint** → new module in `apps/api/src/modules/<domain>/` with controller + service.
- **A shared UI primitive** → `apps/web/src/components/ui/` (until split into a `packages/ui`).
- **A reusable Zod schema** → `packages/types/src/<domain>.ts`.
- **A notification event** → write a `NotificationLog` row now; connect email/browser delivery later.
- **A background job** → add a typed queue contract in `packages/queue` and a worker handler once the worker is deployed.
