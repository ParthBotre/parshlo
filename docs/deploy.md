# Deployment guide

This guide has two parts:

- **Current staging**: Vercel web plus a DigitalOcean droplet running Caddy, API, Postgres, and Redis.
- **Future production**: production database cluster plus a hardened app/runtime deployment. The Terraform/AWS section is a reference target, not the current staging path.

## Current staging API deploy

Staging web deploys automatically from Vercel after a push to `staging`. The API must be deployed on the droplet:

```bash
cd /opt/parshlo
git pull origin staging

docker build -f infra/docker/api.Dockerfile -t parshlo-api:staging .

docker run --rm \
  --env-file /opt/parshlo/api.staging.env \
  --network parshlo_default \
  --entrypoint sh \
  parshlo-api:staging \
  -lc "cd /app && ./packages/db/node_modules/.bin/prisma migrate deploy --schema packages/db/prisma/schema.prisma"

docker rm -f parshlo-api
docker run -d \
  --name parshlo-api \
  --restart unless-stopped \
  --env-file /opt/parshlo/api.staging.env \
  --network parshlo_default \
  -p 127.0.0.1:4000:4000 \
  parshlo-api:staging

sleep 10
curl http://127.0.0.1:4000/v1/health
curl http://127.0.0.1:4000/v1/health/ready
curl https://staging-api.parshlo.com/v1/health
```

Run the migration step for every deploy. Prisma will report "No pending migrations" when no schema change exists.

## Future production architecture reference

```
              ┌───────────────────────┐
   Buyers ───▶│  CloudFront + ACM     │
              │   (Route53 alias)     │
              └──────────┬────────────┘
                         │
              ┌──────────▼────────────┐
              │   ALB (HTTPS)         │
              └────┬─────────────┬────┘
                   │             │
              ┌────▼────┐   ┌────▼─────┐
              │ web TG  │   │ api TG   │
              └────┬────┘   └────┬─────┘
                   │             │
              ┌────▼────┐   ┌────▼─────┐
              │ ECS Web │   │ ECS API  │
              │ Fargate │   │ Fargate  │
              └─────────┘   └────┬─────┘
                                 │
                  ┌──────────────┼──────────────┐
                  │              │              │
              ┌───▼───┐     ┌────▼────┐    ┌────▼─────┐
              │ RDS   │     │ Redis   │    │ S3 (KYC, │
              │ PG 16 │     │ EC 7    │    │ invoices)│
              └───────┘     └────┬────┘    └──────────┘
                                 │
                          ┌──────▼──────┐
                          │ ECS Worker  │
                          │ (BullMQ)    │
                          └─────────────┘
```

## Future image build & registry

Future CI should build the deployed runtime images per release:

| Image            | Dockerfile                                                          |
| ---------------- | ------------------------------------------------------------------- |
| `parshlo/api`    | `infra/docker/api.Dockerfile`                                       |
| `parshlo/web`    | `infra/docker/web.Dockerfile`                                       |
| `parshlo/worker` | `infra/docker/worker.Dockerfile`, when worker deployment is enabled |

Each is multi-stage, non-root, and pinned to a Node 22-alpine runtime.
Tags follow `vYYYY.MM.DD-<short-sha>`. Latest immutable tag is also
labelled `latest-<env>`.

## Future production deploy flow

```bash
# 1. Build & push (CI does this automatically on tags)
make docker-build
docker tag parshlo/api:local <ecr>/parshlo/api:vYYYY.MM.DD-sha
docker push <ecr>/parshlo/api:vYYYY.MM.DD-sha   # repeat for web + worker

# 2. Apply IaC (per env)
cd infra/terraform/environments/staging
terraform init -backend-config=backend.hcl
TF_VAR_api_image=<ecr>/parshlo/api:vYYYY.MM.DD-sha \
TF_VAR_web_image=<ecr>/parshlo/web:vYYYY.MM.DD-sha \
TF_VAR_worker_image=<ecr>/parshlo/worker:vYYYY.MM.DD-sha \
  terraform apply

# 3. Run DB migrations against the new release
DATABASE_URL=postgres://… pnpm --filter @parshlo/db migrate
```

## Secrets

Production secrets should live in the selected managed secrets store, never in Terraform vars or committed env files. If using ECS/AWS, task definitions reference them by ARN and inject them at start time:

- `parshlo/<env>/db-url`
- `parshlo/<env>/redis-url`
- `parshlo/<env>/auth0-secret`
- `parshlo/<env>/email-provider-api-key`, once email is enabled
- `parshlo/<env>/sentry-dsn`

Rotation is monthly via Secrets Manager rotation lambdas.

## Health & readiness

- Liveness: `GET /v1/health` — process is up.
- Readiness: `GET /v1/health/ready` — DB reachable.
- Metrics: `GET /metrics` (Prometheus exposition format).
- Traces: OTLP/HTTP to the OTel Collector (run as a sidecar or DaemonSet).

## Rollback

```bash
# Revert task definition to the previous revision
aws ecs update-service \
  --cluster parshlo-staging-cluster \
  --service api \
  --task-definition parshlo-api:<previous-rev>
```

Database migrations are always forward-only and applied in a separate step,
so an ECS rollback never leaves the schema inconsistent.

## Cost guardrails

The staging environment uses:

- `db.t4g.medium` (single-AZ)
- `cache.t4g.small` (2 nodes)
- Single NAT gateway

Prod uses:

- `db.r6g.large` Multi-AZ
- `cache.r6g.large` × 3
- One NAT per AZ
