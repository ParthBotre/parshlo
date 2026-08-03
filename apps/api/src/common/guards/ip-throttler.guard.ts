import { Injectable, type ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { type AuthPrincipal } from '@parshlo/types';
import { type FastifyRequest } from 'fastify';

/**
 * Rate-limits by client IP (behind trusted proxy) and, when authenticated,
 * by user id so shared NAT IPs cannot exhaust another account's quota.
 */
@Injectable()
export class IpThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    const fastifyReq = req as unknown as FastifyRequest & { user?: AuthPrincipal };
    const forwarded = fastifyReq.headers['x-forwarded-for'];
    const forwardedIp = typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined;

    let ip = fastifyReq.ip;
    if (!ip && forwardedIp) {
      ip = forwardedIp;
    }
    if (!ip) {
      ip = fastifyReq.socket.remoteAddress ?? 'unknown';
    }

    const userId = fastifyReq.user?.userId;
    if (userId) {
      return Promise.resolve(`user:${userId}`);
    }
    return Promise.resolve(`ip:${ip}`);
  }

  protected override generateKey(
    context: ExecutionContext,
    suffix: string,
    throttlerName: string,
  ): string {
    const base = super.generateKey(context, suffix, throttlerName);
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const route = req.routeOptions.url ?? req.url;
    return `${base}:${route}`;
  }
}
