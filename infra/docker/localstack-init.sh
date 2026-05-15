#!/bin/sh
set -e
# Create dev S3 buckets when LocalStack becomes ready.
awslocal s3 mb s3://parshlo-kyc-dev || true
awslocal s3 mb s3://parshlo-invoices-dev || true

# Allow browser PUT/GET to LocalStack from the Next.js dev origin (presigned URLs).
CORS_JSON='{"CORSRules":[{"AllowedHeaders":["*"],"AllowedMethods":["GET","PUT","HEAD"],"AllowedOrigins":["http://localhost:3000","http://127.0.0.1:3000"],"ExposeHeaders":["ETag"],"MaxAgeSeconds":3000}]}'
awslocal s3api put-bucket-cors --bucket parshlo-kyc-dev --cors-configuration "$CORS_JSON" || true
awslocal s3api put-bucket-cors --bucket parshlo-invoices-dev --cors-configuration "$CORS_JSON" || true

echo "✓ LocalStack S3 buckets initialised."
