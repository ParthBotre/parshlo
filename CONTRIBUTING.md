# Contributing to Parshlo

Thanks for taking the time to contribute. This document covers the conventions we keep so the repo stays healthy.

## Ground rules

- **Conventional Commits** are enforced via `commitlint`. Use scopes from `commitlint.config.cjs`.
  - `feat(api): add presigned upload endpoint`
  - `fix(web): redirect after Auth0 logout`
  - `security(api): tighten CSP for catalog page`
- **TypeScript strict** — no `any`, no non-null assertions. Use `unknown` and narrow.
- **Tests required** for:
  - Any new endpoint (controller + service)
  - Any new Zod schema (round-trip + edge cases)
  - Any new business rule (transition validation, MOQ, idempotency, etc.)
- **No PII in logs**. Use the redact paths in `@parshlo/logger`.
- **All mutations are audited** — apply `@Audit({...})` to any state-changing controller method.
- **All authenticated endpoints declare RBAC explicitly** with `@RequireRoles(...)`, even if it's `BUYER`.

## Branches

- `main` is protected. Direct pushes are blocked. PRs require: CI green, 1 reviewer.
- Branch names: `<type>/<short-kebab>` — `feat/buyer-dashboard`, `fix/order-idempotency`.

## Pull requests

- Use the PR template. Fill in the **Security considerations** section even if it's "none".
- One logical change per PR. If the diff exceeds ~500 lines outside of generated files, split it.
- Keep migrations and code that depends on them in the **same** PR.

## Workflow

```bash
pnpm install
make up && make db-migrate && make db-seed
pnpm dev
# ...edit...
pnpm lint && pnpm typecheck && pnpm test
git commit -m "feat(api): ..."
git push -u origin HEAD
gh pr create
```

## Adding a package

1. Create `packages/<name>/package.json` with `"name": "@parshlo/<name>"`.
2. Add `tsconfig.json` extending `@parshlo/config/tsconfig/base.json`.
3. Add `eslint.config.js` extending `@parshlo/config/eslint/base`.
4. Reference it as `workspace:*` from consuming apps/packages.

## Adding an endpoint

1. Add/extend the Zod schema in `packages/types/src/<domain>.ts`.
2. Add controller + service in `apps/api/src/modules/<domain>/`.
3. Apply `@RequireRoles(...)` and `@Audit(...)`.
4. Write a service-level test (Vitest/Jest) and an HTTP test (Supertest).

## Releasing

(see `docs/runbooks/release.md` once added)
