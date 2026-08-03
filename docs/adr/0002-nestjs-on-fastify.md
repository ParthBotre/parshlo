# ADR 0002 — NestJS on Fastify

- **Status**: Accepted
- **Date**: 2026-05-13

## Context

We need a backend that handles 100% TypeScript, dependency injection, strong testability, OpenAPI generation, and patterns most senior engineers will recognise immediately.

## Decision

**NestJS** with the **Fastify** adapter (instead of Express). The project currently runs NestJS 11.

## Consequences

- ✅ Decorator-driven modules + DI map naturally to features (auth, kyc, products, orders, admin).
- ✅ Built-in support for guards (`JwtAuthGuard`, `RolesGuard`), interceptors (`AuditInterceptor`), and pipes (`ZodValidationPipe`).
- ✅ `@nestjs/swagger` gives us OpenAPI for free.
- ✅ Fastify is ~2× faster than Express and has first-class plugins (`@fastify/helmet`, `@fastify/cors`).
- ✅ Predictable code structure → less bus-factor on a multi-engineer team.
- ⚠️ NestJS has a learning curve for engineers used to bare Express. Mitigated by docs and examples in the repo.

## Alternatives considered

- **Express + manual DI**: less ceremony, but every module reinvents auth/validation/errors → high drift risk.
- **Hono / tRPC**: faster to ship for small teams; weaker fit for enterprise B2B with strict RBAC, audit, OpenAPI.
- **Next.js route handlers as the only backend**: rejected because we have async workflows (orders, invoices, emails) that benefit from a dedicated long-lived service.
