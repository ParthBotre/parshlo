# Security model

This document captures the controls baked into Parshlo and the STRIDE-style threat model we evaluate against.

## 1. Identity & access

| Control                                                    | Where                                                       |
| ---------------------------------------------------------- | ----------------------------------------------------------- |
| Auth0 (MFA required for B2B accounts)                      | tenant configuration                                        |
| RS256 JWTs validated via JWKS with key cache + rate limit  | `apps/api/src/modules/auth/auth0-jwt.verifier.ts`           |
| `JwtAuthGuard` runs by default; `@Public()` opts-out       | `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`        |
| `RolesGuard` enforces `@RequireRoles(...)`                 | `apps/api/src/modules/auth/guards/roles.guard.ts`           |
| Permission set derived from roles (single source of truth) | `packages/types/src/auth.ts → ROLE_PERMISSIONS`             |
| `accountStatus` checked at every buyer-only endpoint       | `ProductController.listForBuyer`, `OrderService.placeOrder` |

## 2. Transport & network

- **HTTPS only** in production (HSTS preload).
- **CSP** restricts script/image sources (`next.config.mjs` headers + `@fastify/helmet`).
- **CORS** allowlist configured per environment (`CORS_ALLOWED_ORIGINS`).
- **WAF / DDoS** at CDN tier (Cloudflare recommended).

## 3. Input handling

- **Zod everywhere**: every controller body/query/param is validated via `ZodValidationPipe` against schemas shared with the frontend (`@parshlo/types`).
- **Prisma**: parameterized queries only; raw SQL is reviewed case-by-case.
- **File uploads** are behind the `STORAGE_ENABLED` feature flag. When enabled, uploads should use presigned object-store URLs with enforced `Content-Type` and `Content-Length` limits. Size cap: 10 MB per document.

## 4. Output / logging

- **Pino** structured logger with **redact** for `authorization`, `cookie`, `*.password`, `*.token`, `*.gstin`, `*.pan`, `*.drugLicenseNumber`, `*.pharmacyRegistrationNumber`, `*.mobile`.
- **No HTML rendering of user input** in RSC pages (default escaping).
- `X-Request-Id` propagated through every response.

## 5. Data integrity

- **Audit log**: `@Audit({...})` + global interceptor writes every mutating call to `AuditLog`.
- **Order transitions** restricted to a state machine (`OrderService.TRANSITIONS`).
- **Idempotency**: `(buyerId, idempotencyKey)` unique constraint; retries return the same record.
- **Inventory writes**: `SERIALIZABLE` transactions on order placement; status transitions release/decrement stock atomically.

## 6. Secrets & configuration

- All env vars validated at boot with Zod (`apps/api/src/config/validation.ts`). Missing variables fail fast in CI.
- `.env*` and `*.pem/*.key/*.cert` ignored via `.gitignore`.
- Auth0, Sentry, database, email, and object-storage secrets belong in the deployment platform secret store — Vercel environment variables, the root-only droplet env file for staging, and a managed secrets service for production. They must never be committed.

## 7. Rate limiting

- `@nestjs/throttler` configured with three tiers (1s / 10s / 60s windows). Endpoints can tighten via `@Throttle(...)`.
- Public contact form: 3 submissions per IP per 60 seconds.
- Rate-limit storage moves to Redis in production.

## 8. STRIDE threat model (excerpt)

| Threat                     | Vector                                   | Mitigation                                                                                                                              |
| -------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **S**poofing               | Stolen/replayed JWT                      | Short-lived access tokens, Auth0 anomaly detection, `aud`/`iss` strictly validated, refresh tokens rotated.                             |
| **T**ampering              | Buyer modifies order body to lower price | Server snapshots `wholesalePricePaise` and `gstRate` at order time; client price never trusted.                                         |
| **R**epudiation            | "I didn't place that order"              | Immutable `AuditLog` with actor, IP, UA, request id; order status events with reviewer id.                                              |
| **I**nformation disclosure | Wholesale pricing leaks to public        | Two distinct API surfaces: `/products/public` strips price/MOQ/inventory; only `/products/catalog` (auth + APPROVED) returns full view. |
| **D**enial of service      | Burst of registration / login attempts   | Throttler tiers + Cloudflare/WAF + CAPTCHA on registration in production.                                                               |
| **E**levation of privilege | Buyer hits admin route                   | `RolesGuard` denies; `RequireRoles` enumerates allowed roles; permission set derived in code.                                           |

## 9. KYC + compliance

- Drug license, pharmacy registration, and GSTIN collected at registration.
- Document storage is disabled in current staging unless `STORAGE_ENABLED=true`. When enabled for production, documents must be encrypted at rest and accessed only via presigned URLs scoped to a single object.
- Review workflow:
  ```
  PENDING_VERIFICATION → UNDER_REVIEW → (APPROVED | REJECTED)
  ```
- Approval/rejection requires `ADMIN` or `SUPER_ADMIN` role and writes audit + reason.
- GST validation through GSTN APIs is planned (currently regex-validated; backend stub records GSTIN for manual review).

## 10. Incident response

- See `docs/runbooks/incident-response.md`.
- `SECURITY.md` covers responsible disclosure.

## 11. To-do (production hardening)

- [ ] Move production secrets to the selected managed secrets store with rotation.
- [ ] Enable CSP report-only first, then strict.
- [ ] Add Sentry performance instrumentation; keep session replay off unless privacy masking is intentionally configured.
- [ ] Configure WAF rules for OWASP Top 10 + custom rules for `/auth/*`.
- [ ] Adopt CodeQL + Dependabot + npm audit gating on PRs.
- [ ] Add SOC 2-grade access reviews via Auth0 logs export to a SIEM.
- [ ] Add ClamAV virus scan worker for uploaded KYC docs when document storage is enabled.
- [ ] Penetration test before public launch.
