# Parshlo developer Makefile.
# Conventions: each target is documented; `make help` prints them all.

SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c
.ONESHELL:

PNPM ?= pnpm
COMPOSE ?= docker compose

.PHONY: help
help: ## Show this help.
	@awk 'BEGIN {FS = ":.*##"; printf "Parshlo developer targets:\n\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

.PHONY: install
install: ## Install all workspace dependencies.
	$(PNPM) install

.PHONY: up
up: ## Start dev infra (postgres, redis, mailhog, localstack).
	$(COMPOSE) up -d postgres redis mailhog localstack

.PHONY: down
down: ## Stop dev infra.
	$(COMPOSE) down

.PHONY: db-migrate
db-migrate: ## Apply Prisma migrations in dev.
	$(PNPM) --filter @parshlo/db migrate:dev

.PHONY: db-seed
db-seed: ## Seed the dev database.
	$(PNPM) --filter @parshlo/db seed

.PHONY: db-reset
db-reset: ## Reset the dev DB and re-seed (destructive).
	@echo "Guarded local-only reset. This will refuse non-local DATABASE_URL targets."
	$(PNPM) --filter @parshlo/db migrate:reset

.PHONY: dev
dev: up ## Run web + api in parallel via Turbo (starts Postgres/Redis first).
	$(PNPM) dev

.PHONY: api-restart
api-restart: ## Rebuild API and free port 4000 (then run `make dev` again).
	$(PNPM) --filter @parshlo/api build
	@-lsof -ti :4000 | xargs kill -9 2>/dev/null || true
	@echo "API rebuilt and port 4000 cleared. Start with: make dev"

.PHONY: build
build: ## Build everything.
	$(PNPM) build

.PHONY: lint
lint: ## Lint everything.
	$(PNPM) lint

.PHONY: typecheck
typecheck: ## TypeScript-check everything.
	$(PNPM) typecheck

.PHONY: test
test: ## Run unit + integration tests.
	$(PNPM) test

.PHONY: e2e
e2e: ## Run Playwright E2E tests (web must be up).
	$(PNPM) --filter @parshlo/web test:e2e

.PHONY: format
format: ## Format the repo.
	$(PNPM) format

.PHONY: load-smoke
load-smoke: ## Quick smoke load test (~30s, 5 VUs).
	SMOKE=1 k6 run load/catalog-read.js

.PHONY: load-stress
load-stress: ## Full ramp to 10k VUs (run against staging only).
	k6 run load/catalog-read.js

.PHONY: load-orders
load-orders: ## Authenticated order-placement load (set BUYER_TOKENS).
	k6 run load/order-placement.js

.PHONY: docker-build
docker-build: ## Build production Docker images for api + web.
	docker build -f infra/docker/api.Dockerfile -t parshlo/api:local .
	docker build -f infra/docker/web.Dockerfile -t parshlo/web:local .

.PHONY: clean
clean: ## Remove all build artifacts and node_modules.
	$(PNPM) clean
