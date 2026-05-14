import { SetMetadata } from '@nestjs/common';
import { type FastifyRequest } from 'fastify';

export const AUDIT_KEY = 'parshlo:audit';

export interface AuditMeta {
  action: string;
  resource: string;
  resolveResourceId?: (req: FastifyRequest, result: unknown) => string | undefined;
  metadata?: (req: FastifyRequest, result: unknown) => Record<string, unknown>;
}

/**
 * Mark a controller method to emit an audit log entry on success.
 *
 * @example
 *   @Audit({ action: 'kyc.approve', resource: 'KycApplication', resolveResourceId: (req) => req.params.id })
 *   @Post(':id/approve')
 *   approve(@Param('id') id: string) { ... }
 */
export const Audit = (meta: AuditMeta): MethodDecorator => SetMetadata(AUDIT_KEY, meta);
