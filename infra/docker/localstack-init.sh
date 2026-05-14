#!/bin/sh
set -e
# Create dev S3 buckets when LocalStack becomes ready.
awslocal s3 mb s3://parshlo-kyc-dev || true
awslocal s3 mb s3://parshlo-invoices-dev || true
echo "✓ LocalStack S3 buckets initialised."
