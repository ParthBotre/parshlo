# Terraform — Parshlo AWS infrastructure

Future production-grade IaC for deploying Parshlo on AWS. This is not the current staging deployment path. Current staging uses Vercel for `apps/web` and a DigitalOcean droplet for `apps/api`, Postgres, and Redis.

The configuration is split into reusable modules with remote state in S3 + DynamoDB locks.

## What this provisions

| Layer         | Service                                                                              | Module                  |
| ------------- | ------------------------------------------------------------------------------------ | ----------------------- |
| Network       | VPC, public/private subnets across 3 AZs, NAT gateways                               | `modules/network`       |
| Compute       | ECS Fargate cluster running `api`, `worker`, `web` services behind an ALB            | `modules/ecs`           |
| Data          | RDS PostgreSQL 16 Multi-AZ, ElastiCache Redis cluster, S3 buckets for KYC + invoices | `modules/data`          |
| Edge          | CloudFront in front of the ALB + ACM cert via Route53                                | `modules/edge`          |
| Identity      | Auth0 tenants are managed out-of-band (manual / `auth0` provider optional)           | n/a                     |
| Observability | CloudWatch log groups, OpenTelemetry collector deployment, Sentry release on apply   | `modules/observability` |

## State backend

Remote state lives in `s3://parshlo-terraform-state-<account-id>` with a
DynamoDB table `parshlo-terraform-locks` for concurrent-apply protection.

Bootstrap the backend once:

```bash
cd infra/terraform/bootstrap
terraform init && terraform apply
```

## Environments

```
environments/
  dev/      # smallest possible footprint
  staging/  # production-shape, smaller sizing
  prod/     # full production
```

Each env wires the shared modules with its own variables. Run from inside
the env directory:

```bash
cd environments/staging
terraform init -backend-config=backend.hcl
terraform plan
terraform apply
```

## What's intentionally not Terraformed

- Auth0 tenant configuration (managed in the Auth0 console + exported as JSON).
- Email provider domain verification (provider TBD; one-time DNS records).
- DataDog dashboards (versioned separately in `infra/datadog/`).
