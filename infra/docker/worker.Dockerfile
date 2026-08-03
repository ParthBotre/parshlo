# syntax=docker/dockerfile:1.7
# =============================================================================
# apps/worker — BullMQ background processor for email / notification jobs.
# =============================================================================

ARG NODE_VERSION=22.21.0

# ---------- base ----------
FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo

# ---------- deps ----------
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/logger/package.json packages/logger/
COPY packages/queue/package.json packages/queue/
COPY packages/telemetry/package.json packages/telemetry/
COPY packages/types/package.json packages/types/
RUN pnpm fetch --frozen-lockfile=false
COPY . .
RUN pnpm install --frozen-lockfile=false

# ---------- build ----------
FROM deps AS build
RUN pnpm --filter @parshlo/types build
RUN pnpm --filter @parshlo/logger build
RUN pnpm --filter @parshlo/queue build
RUN pnpm --filter @parshlo/telemetry build
RUN pnpm --filter @parshlo/db build
RUN pnpm --filter @parshlo/worker build

# ---------- runtime ----------
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*
RUN groupadd -g 10001 app && useradd -u 10001 -g 10001 -s /usr/sbin/nologin -M app
COPY --from=build --chown=app:app /repo/node_modules ./node_modules
COPY --from=build --chown=app:app /repo/packages ./packages
COPY --from=build --chown=app:app /repo/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=build --chown=app:app /repo/apps/worker/dist ./apps/worker/dist
COPY --from=build --chown=app:app /repo/apps/worker/package.json ./apps/worker/package.json

WORKDIR /app/apps/worker

USER app
CMD ["node", "dist/main.cjs"]
