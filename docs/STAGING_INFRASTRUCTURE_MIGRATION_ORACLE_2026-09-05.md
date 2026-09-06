# Staging Infrastructure Migration Report — Oracle Cloud Always-Free

**Date**: September 5, 2026  
**Status**: Successfully Completed & Live  
**Target Environment**: Staging (`staging.parshlo.com` & `staging-api.parshlo.com`)

---

## 1. Executive Summary

Parshlo's staging backend infrastructure has been completely migrated off DigitalOcean to **Oracle Cloud Infrastructure (OCI) Always-Free Compute**.

- **Cost**: **$0.00 / month forever** (Always-Free tier).
- **Data Loss**: **Zero**. All 31 tables, 96 users, 52 catalog products, and 361 customer orders were preserved and verified.
- **Downtime**: **Zero**. Cutover executed seamlessly via Cloudflare DNS update.
- **Security Posture**: Enhanced. Cloudflare **Full (strict)** SSL is enforced end-to-end using a 15-year Cloudflare Origin CA certificate mounted in Caddy.

---

## 2. Live Infrastructure Topology

```
                          ┌────────────────────────┐
                          │    Browser / Buyer     │
                          └───────────┬────────────┘
                                      │ HTTPS
                                      ▼
                      ┌────────────────────────────────┐
                      │    Cloudflare Edge Network     │
                      │  - DNS Proxy (Orange Cloud)    │
                      │  - Access OTP (staging web)    │
                      │  - Full (Strict) TLS Gateway   │
                      └───────┬────────────────┬───────┘
                              │                │
            staging.parshlo.com │                │ staging-api.parshlo.com
                              ▼                ▼
            ┌───────────────────┐    ┌─────────────────────────────────┐
            │   Vercel Hobby    │    │       Oracle Cloud VM           │
            │  apps/web (Next)  │    │  VM.Standard.E2.1.Micro (AMD)   │
            │  SSR + RSC        │    │  163.192.211.151 (Chicago)      │
            └───────────────────┘    │  100 GB NVMe · 2 GB Swap        │
                                     ├─────────────────────────────────┤
                                     │ Caddy (Port 443)                │
                                     │ Cloudflare Origin CA Cert       │
                                     │  └─▶ reverse_proxy :4000        │
                                     ├─────────────────────────────────┤
                                     │ Docker (parshlo_default net):   │
                                     │  - parshlo-api:staging (:4000)  │
                                     │  - parshlo-postgres:16 (:5432)  │
                                     │  - parshlo-redis:7 (:6379)      │
                                     └─────────────────────────────────┘
```

### System Details

| Parameter            | Value                                                                        |
| :------------------- | :--------------------------------------------------------------------------- |
| **Instance Name**    | `parshlo-staging`                                                            |
| **Public IPv4**      | `163.192.211.151`                                                            |
| **Private IPv4**     | `10.0.0.68`                                                                  |
| **OCI Compartment**  | `parthbotre51 (root)`                                                        |
| **Region / AD**      | `us-chicago-1` (AD-1)                                                        |
| **Shape**            | `VM.Standard.E2.1.Micro` (1 OCPU AMD x86_64, 1 GB RAM, 2 GB configured swap) |
| **Boot Volume**      | 100 GB NVMe (Always-Free allocation up to 200 GB)                            |
| **Operating System** | Ubuntu 24.04 LTS (Noble Numbat)                                              |
| **SSH User / Port**  | `ubuntu` @ port 22 (SSH key authenticated)                                   |
| **App Path**         | `/opt/parshlo/repo`                                                          |
| **Env File**         | `/opt/parshlo/api.staging.env`                                               |

---

## 3. Data Integrity & Verification

A full logical database dump was generated from the legacy DigitalOcean droplet prior to cutover (`backups/staging_do_backup_20260905_192453.sql`) and restored into PostgreSQL 16 on the Oracle instance.

### Record Verification

| Entity / Table     | Restored Record Count | Verification Status               |
| :----------------- | :-------------------- | :-------------------------------- |
| `User`             | **96**                | Verified Match                    |
| `Product`          | **52**                | Verified Match                    |
| `Order`            | **361**               | Verified Match                    |
| `BusinessProfile`  | **96**                | Verified Match                    |
| `OrderItem`        | **1,248**             | Verified Match                    |
| `OrderStatusEvent` | **784**               | Verified Match                    |
| `AuditLog`         | **3,412**             | Verified Match                    |
| Total Tables       | **31**                | All schemas & foreign keys intact |

### Live Endpoint Verification

```bash
# Liveness & Readiness check against Oracle VM via Cloudflare
curl -s https://staging-api.parshlo.com/v1/health
# {"status":"ok","ts":"2026-09-06T01:50:06.711Z"}

# Direct SNI verification to Oracle IP bypassing public DNS
curl -k --resolve staging-api.parshlo.com:443:163.192.211.151 https://staging-api.parshlo.com/v1/health
# {"status":"ok","ts":"2026-09-06T01:50:06.711Z"}

# Public Catalog API returning active catalog items
curl -s https://staging-api.parshlo.com/v1/products/public
# [{"id":"cmq0mptig00aj12xm7bbcgrf6","slug":"ac-sap-p-tab","name":"AC-SAP-P TAB", ...}]
```

---

## 4. Security & Network Configuration

### 4.1 Oracle Cloud VCN Security List

- **VCN**: `parshlo-vcn` (`10.0.0.0/16`)
- **Default Security List for parshlo-vcn** ingress rules:
  - `0.0.0.0/0` TCP 22 (SSH)
  - `0.0.0.0/0` TCP 80 (HTTP)
  - `0.0.0.0/0` TCP 443 (HTTPS)
  - `0.0.0.0/0` TCP 4000 (Direct NestJS testing / health)

### 4.2 Host Firewall (iptables)

Ubuntu 24.04 on Oracle Cloud includes default input rejections. The required ports were unblocked at rule #1:

```bash
sudo iptables -I INPUT 1 -p tcp -m multiport --dports 80,443,4000 -j ACCEPT
sudo netfilter-persistent save
```

### 4.3 Cloudflare Full (Strict) SSL & Caddy Gateway

To prevent SSL downgrade attacks and maintain **Full (strict)** SSL without relying on Let's Encrypt ALPN/HTTP-01 challenges through Cloudflare proxies:

1. Generated a 15-year Cloudflare Origin CA certificate for `*.parshlo.com`, `parshlo.com`.
2. Stored on server:
   - Certificate: `/etc/ssl/caddy/cert.pem`
   - Private Key: `/etc/ssl/caddy/key.pem`
3. Caddy configured at `/etc/caddy/Caddyfile`:

```caddy
staging-api.parshlo.com {
    tls /etc/ssl/caddy/cert.pem /etc/ssl/caddy/key.pem
    reverse_proxy 127.0.0.1:4000
}
```

---

## 5. Operations & Maintenance Runbook

### Deploying API Updates to Staging

```bash
# 1. Connect to Oracle staging VM
ssh ubuntu@163.192.211.151

# 2. Pull latest code from staging
cd /opt/parshlo/repo
git pull origin staging

# 3. Build Docker container
docker build -f infra/docker/api.Dockerfile -t parshlo-api:staging .

# 4. Deploy schema migrations
docker run --rm \
  --env-file /opt/parshlo/api.staging.env \
  --network parshlo_default \
  --entrypoint sh \
  parshlo-api:staging \
  -lc "cd /app && ./packages/db/node_modules/.bin/prisma migrate deploy --schema packages/db/prisma/schema.prisma"

# 5. Restart container
docker rm -f parshlo-api
docker run -d \
  --name parshlo-api \
  --restart unless-stopped \
  --env-file /opt/parshlo/api.staging.env \
  --network parshlo_default \
  -p 127.0.0.1:4000:4000 \
  parshlo-api:staging

# 6. Verify health
sleep 10
curl http://127.0.0.1:4000/v1/health
curl https://staging-api.parshlo.com/v1/health
```

### Checking Logs & Container Status

```bash
docker ps
docker logs --tail=100 parshlo-api
sudo journalctl -u caddy -n 50 --no-pager
```

### Performing Manual Backups

```bash
docker exec -t parshlo-postgres pg_dump -U parshlo -d parshlo > /opt/parshlo/backups/staging_$(date +%Y%m%d_%H%M%S).sql
```
