import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type FastifyRequest } from 'fastify';

import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator.js';
import { type AuthenticatedRequest } from '../../../common/types/request.js';
import { Auth0JwtVerifier } from '../auth0-jwt.verifier.js';
import { DevJwtVerifier } from '../dev-jwt.verifier.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth0Verifier: Auth0JwtVerifier,
    private readonly devVerifier: DevJwtVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest<FastifyRequest & AuthenticatedRequest>();
    const authHeader = req.headers.authorization;
    if (!authHeader?.toLowerCase().startsWith('bearer ')) {
      throw new UnauthorizedException({ code: 'TOKEN_MISSING' });
    }
    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new UnauthorizedException({ code: 'TOKEN_MISSING' });
    }

    // Pick verifier by token shape: HS256 dev tokens vs RS256 Auth0 tokens.
    // Header alg is base64url-encoded JSON; cheap to peek.
    const alg = peekAlg(token);
    const useDev = process.env.AUTH_MODE === 'dev' && alg === 'HS256';

    req.user = useDev
      ? await this.devVerifier.verify(token)
      : await this.auth0Verifier.verify(token);
    return true;
  }
}

function peekAlg(token: string): string | undefined {
  const headerSegment = token.split('.')[0];
  if (!headerSegment) {
    return undefined;
  }
  try {
    const json = Buffer.from(headerSegment, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as { alg?: string };
    return parsed.alg;
  } catch {
    return undefined;
  }
}
