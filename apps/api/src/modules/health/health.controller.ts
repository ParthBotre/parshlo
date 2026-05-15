import { Controller, Get, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

import { Public } from '../../common/decorators/public.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Two-tier health endpoint pattern used by Kubernetes / ALB:
 *   - /health        liveness  — only verifies the process can respond
 *   - /health/ready  readiness — verifies all critical deps are reachable
 */
@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  liveness(): { status: 'ok'; ts: string } {
    return { status: 'ok', ts: new Date().toISOString() };
  }

  @Public()
  @Get('ready')
  async readiness(): Promise<{ status: 'ok'; checks: Record<string, 'ok'> }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        code: 'DEPENDENCY_DOWN',
        message: 'Database unreachable',
        status: HttpStatus.SERVICE_UNAVAILABLE,
      });
    }
    return { status: 'ok', checks: { database: 'ok' } };
  }
}
