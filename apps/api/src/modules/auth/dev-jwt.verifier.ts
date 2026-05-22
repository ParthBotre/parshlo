import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type AuthPrincipal, ROLE_PERMISSIONS, type Role } from '@parshlo/types';
import { jwtVerify } from 'jose';

/**
 * Verifies HS256 tokens issued by the web app's dev-login route.
 *
 * Activated only when `AUTH_MODE=dev`. Production builds NEVER instantiate
 * this; the JwtAuthGuard only constructs it conditionally.
 */
@Injectable()
export class DevJwtVerifier {
  private secret: Uint8Array;

  constructor(config: ConfigService) {
    const raw = config.get<string>('AUTH_DEV_SECRET') ?? process.env.AUTH_DEV_SECRET;
    if (!raw || raw.length < 32) {
      throw new Error('AUTH_DEV_SECRET missing or too short for dev auth mode.');
    }
    this.secret = new TextEncoder().encode(raw);
  }

  async verify(token: string): Promise<AuthPrincipal> {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        issuer: 'parshlo-dev',
        audience: 'parshlo-dev',
      });
      const sub = payload.sub;
      const userId = payload['https://parshlo.com/user_id'];
      const roles = payload['https://parshlo.com/roles'];
      const email = payload.email;
      if (typeof sub !== 'string' || typeof userId !== 'string' || !Array.isArray(roles)) {
        throw new Error('Invalid dev claims');
      }
      const r = roles as Role[];
      const derived = new Set(r.flatMap((role) => ROLE_PERMISSIONS[role]));
      return {
        auth0Id: sub,
        userId,
        email: typeof email === 'string' ? email : undefined,
        roles: r,
        permissions: [...derived],
      };
    } catch (err) {
      throw new UnauthorizedException({
        code: 'DEV_TOKEN_INVALID',
        message: err instanceof Error ? err.message : 'Dev token verification failed',
      });
    }
  }
}
