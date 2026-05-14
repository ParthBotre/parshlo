import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type FastifyRequest } from 'fastify';
import { type Observable, tap } from 'rxjs';

import { AUDIT_KEY, type AuditMeta } from '../decorators/audit.decorator.js';
import { PrismaService } from '../../modules/prisma/prisma.service.js';
import { type AuthenticatedRequest } from '../types/request.js';

/**
 * Interceptor that writes an AuditLog row whenever a handler has been decorated
 * with @Audit({ action, resource }). It runs AFTER the handler completes
 * successfully so failed mutations don't pollute the audit trail.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMeta | undefined>(
      AUDIT_KEY,
      context.getHandler(),
    );
    if (!meta) {
      return next.handle();
    }

    const req = context
      .switchToHttp()
      .getRequest<FastifyRequest & AuthenticatedRequest>();

    return next.handle().pipe(
      tap((result: unknown) => {
        const resourceId = meta.resolveResourceId
          ? meta.resolveResourceId(req, result)
          : undefined;
        // Best-effort; failures must NOT break the request.
        this.prisma.auditLog
          .create({
            data: {
              actorId: req.user?.userId ?? null,
              action: meta.action,
              resource: meta.resource,
              resourceId: resourceId ?? null,
              ipAddress: req.ip,
              userAgent: req.headers['user-agent'] ?? null,
              requestId: (req.id as string | undefined) ?? null,
              metadata: meta.metadata?.(req, result) ?? undefined,
            },
          })
          .catch(() => {
            // Audit failure is logged elsewhere by the global filter; never throw.
          });
      }),
    );
  }
}
