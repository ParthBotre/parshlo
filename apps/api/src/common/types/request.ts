import { type AuthPrincipal } from '@parshlo/types';
import { type FastifyRequest } from 'fastify';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: AuthPrincipal;
}
