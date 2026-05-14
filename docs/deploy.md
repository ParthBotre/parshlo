# Deployment guide

## Architecture (production)

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

## Image build & registry

CI builds three images per release:

| Image | Dockerfile |
| --- | --- |
| `parshlo/api`    | `infra/docker/api.Dockerfile`    |
| `parshlo/web`    | `infra/docker/web.Dockerfile`    |
| `parshlo/worker` | `infra/docker/worker.Dockerfile` |

Each is multi-stage, non-root, and pinned to a Node 22-alpine runtime.
Tags follow `vYYYY.MM.DD-<short-sha>`. Latest immutable tag is also
labelled `latest-<env>`.

## Deploy flow

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

Secrets live in **AWS Secrets Manager**, never in Terraform vars or env files.
ECS task definitions reference them by ARN and inject them at start time:

- `parshlo/<env>/db-url`
- `parshlo/<env>/redis-url`
- `parshlo/<env>/auth0-secret`
- `parshlo/<env>/resend-api-key`
- `parshlo/<env>/sentry-dsn`

Rotation is monthly via Secrets Manager rotation lambdas.

## Health & readiness

- Liveness: `GET /health` — process is up.
- Readiness: `GET /health/ready` — DB + Redis reachable.
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
