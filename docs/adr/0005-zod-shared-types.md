# ADR 0005 — Zod as the contract source of truth

- **Status**: Accepted
- **Date**: 2026-05-13

## Context

The web and api apps need to agree on request/response shapes. We want validation that works in both Node and the browser, generates TS types automatically, and doesn't require a separate IDL.

## Decision

All cross-cutting schemas live in **`@parshlo/types`** as Zod schemas. Both apps import them:

- API uses them in `ZodValidationPipe` to validate request bodies.
- Web uses them with `react-hook-form` + `@hookform/resolvers/zod` for client-side forms.
- TypeScript types are inferred via `z.infer<typeof Schema>` — no manual sync.

Domain-level primitives (`Gstin`, `Pan`, `IndianMobile`, `IndianPin`) are exported and reused.

## Consequences

- ✅ One change to a schema, two consumers updated; impossible to drift.
- ✅ Domain validators (e.g., GSTIN regex) live in one place.
- ✅ Easy to roundtrip-test schemas with vitest.
- ⚠️ Zod parsing has a small runtime cost on hot paths; mitigated with `.safeParse` and avoiding excessive nested unions.

## Alternatives considered

- **OpenAPI + codegen**: more bureaucratic; valuable when we have many polyglot consumers.
- **Class-validator** (NestJS default): tied to NestJS, not usable in the browser.
- **TypeBox / Valibot**: viable; Zod chosen for ecosystem maturity (react-hook-form, tRPC, Next.js examples).
