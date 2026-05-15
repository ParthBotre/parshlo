import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { type ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';

interface ThrottlerHitRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

const KEY_PREFIX = 'parshlo:throttle';

/**
 * Distributed rate-limit storage backed by Redis.
 * Required for multi-instance API deployments; falls back to in-memory when unset.
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnApplicationShutdown {
  private readonly redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    void this.redis.connect().catch(() => {
      // Connection errors surface on first increment; boot must not crash if Redis is down.
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerHitRecord> {
    const hitsKey = `${KEY_PREFIX}:hits:${throttlerName}:${key}`;
    const blockKey = `${KEY_PREFIX}:block:${throttlerName}:${key}`;

    const blockTtlMs = await this.redis.pttl(blockKey);
    if (blockTtlMs > 0) {
      const hitsRaw = await this.redis.get(hitsKey);
      return {
        totalHits: Number(hitsRaw ?? limit + 1),
        timeToExpire: Math.max(1, Math.ceil(blockTtlMs / 1000)),
        isBlocked: true,
        timeToBlockExpire: Math.max(1, Math.ceil(blockTtlMs / 1000)),
      };
    }

    const totalHits = await this.redis.incr(hitsKey);
    if (totalHits === 1) {
      await this.redis.pexpire(hitsKey, ttl);
    }

    const hitsTtlMs = await this.redis.pttl(hitsKey);
    const timeToExpire = Math.max(1, Math.ceil((hitsTtlMs > 0 ? hitsTtlMs : ttl) / 1000));

    if (totalHits > limit) {
      await this.redis.set(blockKey, '1', 'PX', blockDuration > 0 ? blockDuration : ttl);
      const blockMs = await this.redis.pttl(blockKey);
      return {
        totalHits,
        timeToExpire,
        isBlocked: true,
        timeToBlockExpire: Math.max(1, Math.ceil((blockMs > 0 ? blockMs : blockDuration) / 1000)),
      };
    }

    return {
      totalHits,
      timeToExpire,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }

  onApplicationShutdown(): void {
    this.redis.disconnect();
  }
}
