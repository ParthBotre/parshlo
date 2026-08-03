# ADR 0001 — Monorepo with pnpm + Turborepo

- **Status**: Accepted
- **Date**: 2026-05-13

## Context

We have two long-lived deployables (`apps/web`, `apps/api`) sharing types, validation schemas, logger config, and a Prisma client. Independent repos would duplicate config, introduce drift in shared types, and slow contributors.

## Decision

Use a **single monorepo** with:

- **pnpm workspaces** for symlinked, deduplicated installs.
- **Turborepo** for task orchestration (build/lint/typecheck/test), remote caching when needed.
- Shared packages under `packages/*`: `config`, `types`, `db`, `logger`.

## Consequences

- ✅ One commit can change the shared schema in `@parshlo/types` and the consuming code in `apps/web` and `apps/api` together. Atomic refactors.
- ✅ Single `pnpm-lock.yaml` ensures reproducible installs across CI.
- ✅ Turbo's content-aware cache makes CI cheap (only rebuild what changed).
- ⚠️ Slightly more cognitive load for new contributors; mitigated by a clear `README` and `make help`.
- ⚠️ Mass version bumps require coordination — accepted trade-off.

## Alternatives considered

- **Nx**: heavier, more opinionated, more value for very large orgs. Overkill at our scale.
- **Polyrepo**: rejected for the drift reasons above.
- **Yarn 4 workspaces**: viable; pnpm chosen for faster installs and stricter isolation.
