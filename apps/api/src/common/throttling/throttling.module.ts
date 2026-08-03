import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { type AppConfig } from '../../config/configuration.js';

import { RedisThrottlerStorage } from './redis-throttler.storage.js';
import { GLOBAL_THROTTLE_TIERS } from './throttle.constants.js';

@Global()
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig>) => {
        const nodeEnv = config.get('nodeEnv', { infer: true });
        const redisUrl = config.get('redis.url', { infer: true });
        // In-memory limits are fine for single-instance local dev; Redis is required in prod.
        const useRedis = nodeEnv === 'production' && Boolean(redisUrl);

        return {
          throttlers: GLOBAL_THROTTLE_TIERS,
          ...(useRedis && redisUrl ? { storage: new RedisThrottlerStorage(redisUrl) } : {}),
          errorMessage: 'Too many requests. Please try again later.',
        };
      },
    }),
  ],
  exports: [ThrottlerModule],
})
export class ThrottlingModule {}
