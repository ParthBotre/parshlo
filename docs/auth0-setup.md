# Auth0 setup for Parshlo

Use this when `AUTH_MODE=auth0` (production and staging). Local development can keep `AUTH_MODE=dev` with demo personas.

## 1. Auth0 application

1. Create a **Regular Web Application** in the [Auth0 Dashboard](https://manage.auth0.com/).
2. Settings → Application URIs:
   - **Allowed Callback URLs**: `http://localhost:3000/api/auth/callback`
   - **Allowed Logout URLs**: `http://localhost:3000`
3. Advanced → OAuth: **JsonWebToken Signature Algorithm** = `RS256`, **OIDC Conformant** = on.

## 2. API (Resource Server)

1. APIs → Create API
   - **Identifier**: `https://api.parshlo.local` (must match `AUTH0_AUDIENCE`)
   - **Signing Algorithm**: RS256

## 3. Environment variables

Copy values into root `.env` and `apps/web/.env.local`:

```bash
AUTH_MODE=auth0

# Web (@auth0/nextjs-auth0)
AUTH0_SECRET=<openssl rand -hex 32>
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://YOUR_TENANT.us.auth0.com
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_AUDIENCE=https://api.parshlo.local

# API (JWKS verification)
AUTH0_DOMAIN=YOUR_TENANT.us.auth0.com
```

`AUTH0_ISSUER_BASE_URL` must match your tenant (with or without trailing slash — the API normalizes it).

## 4. Link Auth0 users to Parshlo accounts

Parshlo stores roles in Postgres. After a user signs in with Auth0:

1. Their Auth0 `sub` is matched to `User.auth0Id`, or
2. Their email is matched and `auth0Id` is updated on first login.

Seeded dev users (`admin@parshlo.local`, `buyer@parshlo.local`) only work in `AUTH_MODE=dev`. For Auth0, create users in Auth0 with the **same email** as seeded rows, or register via the B2B flow.

If `/users/me` returns not provisioned, call:

```http
POST /v1/auth/sync
Authorization: Bearer <auth0-access-token>
```

## 5. Optional: custom claims (Auth0 Action)

You can add a **Login Action** to attach namespaced claims to the access token:

- `https://parshlo.com/user_id`
- `https://parshlo.com/roles`

The API **does not require** these claims — it loads roles from the database. Custom claims are optional for middleware role hints.

## 6. Run

```bash
make dev
```

Sign in at http://localhost:3000/auth/sign-in → **Continue with Auth0**.
