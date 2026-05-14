# ADR 0003 — Prisma + Postgres

- **Status**: Accepted
- **Date**: 2026-05-13

## Context
We need a relational store with strong transactional semantics (orders + inventory + audit), ergonomic migrations, and tight TypeScript integration.

## Decision
- **PostgreSQL 16** as the primary store.
- **Prisma 5** as the ORM and migration tool.
- Money columns use `BigInt` (paise) to avoid floating-point drift on GST math.

## Consequences
- ✅ Prisma's generated client provides end-to-end type safety from DB → API → web.
- ✅ Migrations are version-controlled SQL with painless rollbacks.
- ✅ `prisma.$transaction(..., { isolationLevel: Serializable })` for order placement gives us correctness on stock races.
- ✅ Postgres has the indexing, RLS, and JSONB capability we need for `AuditLog.metadata`.
- ⚠️ Prisma raw queries are limited; complex analytics use `$queryRaw` with parameter binding.
- ⚠️ Prisma's generated client is large; we mitigate with `transpilePackages` in Next.js and standalone output in Docker.

## Alternatives considered
- **Drizzle**: thinner, closer-to-SQL ergonomics; we may revisit if Prisma's bundle size becomes a bottleneck for serverless.
- **TypeORM**: lower momentum, weaker DX.
- **MongoDB**: rejected — strong relational integrity is core to procurement/audit.
