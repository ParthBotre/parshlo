import { Injectable, type OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessTokenClaims, type AuthPrincipal, ROLE_PERMISSIONS } from '@parshlo/types';
import jwt, { type JwtHeader, type VerifyCallback } from 'jsonwebtoken';
import jwksClient, { type JwksClient } from 'jwks-rsa';

import { type AppConfig } from '../../config/configuration.js';

/**
 * Verifies Auth0-issued RS256 JWTs using JWKS with key caching and rate limit.
 * Extracts our application's principal (internal user id, roles, permissions).
 */
@Injectable()
export class Auth0JwtVerifier implements OnModuleInit {
  private jwks!: JwksClient;
  private issuer!: string;
  private audience!: string;

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  onModuleInit(): void {
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

  /** Verifies the token and returns the application principal. */
  async verify(token: string): Promise<AuthPrincipal> {
    let decoded: unknown;
    try {
      decoded = await new Promise<unknown>((resolve, reject) => {
        const getKey: VerifyCallback = () => {
          // unused; placeholder to satisfy the type system
        };
        void getKey;
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

    const parsed = AccessTokenClaims.safeParse(decoded);
    if (!parsed.success) {
      throw new UnauthorizedException({
        code: 'TOKEN_CLAIMS_INVALID',
        message: 'Token payload missing required claims',
      });
    }
    const claims = parsed.data;
    const roles = claims['https://parshlo.com/roles'];
    const tokenPermissions = claims['https://parshlo.com/permissions'];
    const derived = new Set([
      ...tokenPermissions,
      ...roles.flatMap((r) => ROLE_PERMISSIONS[r]),
    ]);

    const userId = claims['https://parshlo.com/user_id'];
    if (!userId) {
      // First-time login: the post-login Action hasn't provisioned the internal
      // user yet. The /v1/auth/sync endpoint handles that.
      throw new UnauthorizedException({
        code: 'USER_NOT_PROVISIONED',
        message: 'Account is not yet provisioned. Call /v1/auth/sync.',
      });
    }

    return {
      auth0Id: claims.sub,
      userId,
      email: claims.email,
      roles,
      permissions: [...derived],
    };
  }
}
