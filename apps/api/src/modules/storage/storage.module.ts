import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';

import { StorageController } from './storage.controller.js';
import { StorageService } from './storage.service.js';

export const S3_CLIENT = Symbol('S3_CLIENT');

@Module({
  controllers: [StorageController],
  providers: [
    {
      provide: S3_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): S3Client =>
        new S3Client({
          region: config.get<string>('AWS_REGION') ?? 'ap-south-1',
          endpoint: config.get<string>('S3_ENDPOINT'),
          forcePathStyle: Boolean(config.get<string>('S3_ENDPOINT')),
          credentials:
            process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
              ? {
                  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                }
              : undefined,
        }),
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
