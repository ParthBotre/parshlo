import { Injectable, type OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type AuthPrincipal, ROLE_PERMISSIONS, type Role } from '@parshlo/types';
import jwt, { type JwtHeader } from 'jsonwebtoken';
import jwksClient, { type JwksClient } from 'jwks-rsa';

import { type AppConfig } from '../../config/configuration.js';
import { PrismaService } from '../prisma/prisma.service.js';

interface VerifiedAuth0Claims {
  sub: string;
  email?: string;
}

/**
 * Verifies Auth0-issued RS256 JWTs via JWKS.
 * Roles and permissions always come from our database — not token claims.
 */
@Injectable()
export class Auth0JwtVerifier implements OnModuleInit {
  private jwks!: JwksClient;
  private issuer!: string;
  private audience!: string;

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    if (process.env.AUTH_MODE !== 'auth0') {
      return;
    }
    const auth0 = this.config.get('auth0', { infer: true });
    this.issuer = auth0.issuer.endsWith('/') ? auth0.issuer : `${auth0.issuer}/`;
    this.audience = auth0.audience;
    this.jwks = jwksClient({
      jwksUri: `${this.issuer}.well-known/jwks.json`,
      cache: true,
      cacheMaxEntries: 10,
      cacheMaxAge: 10 * 60 * 1000,
      rateLimit: true,
      jwksRequestsPerMinute: 30,
      timeout: 5_000,
    });
  }

  /** Verifies the token signature and resolves the user from our database. */
  async verify(token: string): Promise<AuthPrincipal> {
    const claims = await this.verifyTokenClaims(token);
    return this.principalFromClaims(claims);
  }

  /** Verify signature/audience only — used by /auth/sync before DB link exists. */
  async verifyTokenClaims(token: string): Promise<VerifiedAuth0Claims> {
    let decoded: unknown;
    try {
      decoded = await new Promise<unknown>((resolve, reject) => {
        jwt.verify(
          token,
          (header: JwtHeader, cb) => {
            if (!header.kid) {
              cb(new Error('Missing kid'));
              return;
            }
            this.jwks.getSigningKey(header.kid, (err, key) => {
              if (err) {
                cb(err);
                return;
              }
              cb(null, key?.getPublicKey());
            });
          },
          {
            algorithms: ['RS256'],
            issuer: this.issuer,
            audience: this.audience,
          },
          (err, payload) => {
            if (err) {
              reject(err);
            } else {
              resolve(payload);
            }
          },
        );
      });
    } catch (err) {
      throw new UnauthorizedException({
        code: 'TOKEN_INVALID',
        message: err instanceof Error ? err.message : 'Token verification failed',
      });
    }

    if (typeof decoded !== 'object' || decoded === null) {
      throw new UnauthorizedException({ code: 'TOKEN_CLAIMS_INVALID' });
    }
    const record = decoded as Record<string, unknown>;
    const sub = record.sub;
    if (typeof sub !== 'string') {
      throw new UnauthorizedException({
        code: 'TOKEN_CLAIMS_INVALID',
        message: 'Token missing subject',
      });
    }
    const email = typeof record.email === 'string' ? record.email.toLowerCase() : undefined;
    return { sub, email };
  }

  async principalFromClaims(claims: VerifiedAuth0Claims): Promise<AuthPrincipal> {
    let user = await this.prisma.user.findUnique({ where: { auth0Id: claims.sub } });

    if (!user && claims.email) {
      user = await this.prisma.user.findUnique({ where: { email: claims.email } });
      if (user && user.auth0Id !== claims.sub) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { auth0Id: claims.sub },
        });
      }
    }

    if (!user || user.deletedAt) {
      throw new UnauthorizedException({
        code: 'USER_NOT_PROVISIONED',
        message:
          'No Parshlo account linked to this Auth0 user. Request B2B access or contact support.',
      });
    }

    const roles = user.roles as Role[];
    const derived = new Set(roles.flatMap((role) => ROLE_PERMISSIONS[role]));

    return {
      auth0Id: claims.sub,
      userId: user.id,
      email: user.email,
      roles,
      permissions: [...derived],
    };
  }
}
