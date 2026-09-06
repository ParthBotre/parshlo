#!/usr/bin/env bash
set -euo pipefail

echo "==> [1/3] Running database migrations..."
sudo docker run --rm \
  --env-file /opt/parshlo/api.staging.env \
  --network parshlo_default \
  --entrypoint sh \
  parshlo-api:staging \
  -lc "cd /app && ./packages/db/node_modules/.bin/prisma migrate deploy --schema packages/db/prisma/schema.prisma"

echo "==> [2/3] Restarting parshlo-api container..."
sudo docker rm -f parshlo-api 2>/dev/null || true
sudo docker run -d \
  --name parshlo-api \
  --restart unless-stopped \
  --env-file /opt/parshlo/api.staging.env \
  --network parshlo_default \
  -p 127.0.0.1:4000:4000 \
  parshlo-api:staging

echo "==> [3/3] Verifying API health..."
sleep 3
curl -s http://127.0.0.1:4000/v1/health
echo ""
echo "==> Deployment finished successfully!"
