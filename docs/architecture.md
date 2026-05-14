# Architecture

This document walks through how Parshlo is put together: the request flow, the data model, and the trust boundaries.

## 1. High-level diagram

```mermaid
flowchart LR
  subgraph Browser
    Public[Public visitor]
    Buyer[Verified B2B buyer]
    Admin[Internal admin]
  end

  subgraph Edge
    CDN[CDN + WAF]
  end

  subgraph Frontend
    Web[apps/web<br/>Next.js 15<br/>RSC + Server Actions]
  end

  subgraph Identity
    Auth0[Auth0 tenant<br/>MFA · post-login Action]
  end

  subgraph Backend
    API[apps/api<br/>NestJS + Fastify]
    Worker[Background workers<br/>BullMQ]
  end

  subgraph Data
    PG[(Postgres 16)]
    Redis[(Redis 7)]
    S3[(S3)]
  end

  subgraph 3rdParty
    Resend[Resend]
    Sentry[Sentry]
    OTel[OTel collector]
  end

  Public & Buyer & Admin -->|HTTPS| CDN --> Web
  Web -->|Bearer JWT| API
  Web -->|OIDC redirect| Auth0
  API -->|JWKS verify| Auth0
  API --> PG
  API --> Redis
  API --> S3
  API -->|enqueue| Worker
  Worker --> Resend
  Worker --> PG
  Worker --> S3
  API & Web --> Sentry
  API & Web --> OTel
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

| Boundary | Trust direction | Controls |
| --- | --- | --- |
| Browser → Web | untrusted → semi-trusted | HTTPS, HSTS, CSP, XSS-safe RSC, CSRF tokens on Server Actions |
| Web → API | semi-trusted → trusted | Bearer JWT from Auth0, CORS allowlist, no credentials forwarding |
| API → DB | trusted → trusted | Connection pool, parameterized queries via Prisma, least-privileged role |
| API → S3 | trusted → trusted | IAM role, presigned URLs only, SSE-KMS encryption, bucket policy denying public ACLs |
| API → Auth0 | trusted → trusted | JWKS over HTTPS, cached + rate-limited |

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
```

Key invariants:
- `BusinessProfile.gstin` is **globally unique**.
- An order is uniquely identified by `(buyerId, idempotencyKey)`.
- `OrderItem.productNameSnapshot` is immutable after creation so historical invoices remain accurate even if the product name changes.
- Money is stored as `BigInt` paise; never as floats.

## 5. Where to add things

- **A new entity** → `packages/db/prisma/schema.prisma` + migration + `@parshlo/types` schema.
- **A new endpoint** → new module in `apps/api/src/modules/<domain>/` with controller + service.
- **A shared UI primitive** → `apps/web/src/components/ui/` (until split into a `packages/ui`).
- **A reusable Zod schema** → `packages/types/src/<domain>.ts`.
- **A background job** → new BullMQ queue under `apps/api/src/modules/queues/` (planned).
