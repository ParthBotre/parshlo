# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in Parshlo, **do not** open a public issue. Email the maintainers at **security@parshlo.com** with:

1. A short description of the issue and its impact.
2. Reproduction steps (PoC if possible).
3. Affected component (api, web, infra, dependency).
4. Your contact info so we can follow up.

We aim to acknowledge within **48 hours** and provide a remediation timeline within **5 business days**. We will keep you informed throughout the disclosure window.

## Scope

In scope:

- Authentication / authorization bypass (Auth0 wiring, JWT validation, RBAC).
- Order/KYC workflow integrity (price tampering, stock race conditions, idempotency bypass).
- Audit/integrity (gaps in `AuditLog`, log injection, PII leakage in logs).
- File upload abuse (S3 presign misuse, content-type / size bypass).
- Server-side / client-side injection (SQLi via Prisma raw, XSS, SSRF, prototype pollution).
- Dependency vulnerabilities directly exploitable in the running app.

Out of scope:

- Reports from automated scanners without a working exploit.
- Theoretical issues without a clear attack vector.
- Social engineering, physical access attacks.

## Coordinated disclosure

We follow [coordinated disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure). Please do not publicize the issue until we have shipped a fix.
