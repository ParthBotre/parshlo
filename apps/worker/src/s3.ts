import { S3Client as AwsS3Client } from '@aws-sdk/client-s3';

import { config } from './config.js';

export type S3Client = AwsS3Client;

export function createS3Client(): S3Client {
  return new AwsS3Client({
    region: config.AWS_REGION,
    endpoint: config.S3_ENDPOINT,
    forcePathStyle: Boolean(config.S3_ENDPOINT), // required for LocalStack
    credentials:
      config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: config.AWS_ACCESS_KEY_ID,
            secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
  });
}
