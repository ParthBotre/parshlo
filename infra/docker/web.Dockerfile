# syntax=docker/dockerfile:1.7
# =============================================================================
# apps/web — Next.js standalone output, multi-stage, non-root.
# =============================================================================

ARG NODE_VERSION=22.21.0

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/
COPY packages/types/package.json packages/types/
RUN pnpm fetch --frozen-lockfile=false
COPY . .
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
RUN pnpm --filter @parshlo/web build

FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

RUN groupadd -g 10001 app && useradd -u 10001 -g 10001 -s /usr/sbin/nologin -M app
COPY --from=build --chown=app:app /repo/apps/web/.next ./.next
COPY --from=build --chown=app:app /repo/apps/web/public ./public
COPY --from=build --chown=app:app /repo/apps/web/package.json ./package.json
COPY --from=build --chown=app:app /repo/apps/web/next.config.mjs ./next.config.mjs
COPY --from=build --chown=app:app /repo/node_modules ./node_modules

USER app
EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
