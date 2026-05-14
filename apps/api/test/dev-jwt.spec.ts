/**
 * Verifies the dev token verifier accepts well-formed HS256 tokens and
 * rejects everything else. No NestJS bootstrap required.
 */
import { ConfigService } from '@nestjs/config';
import { SignJWT } from 'jose';

import { DevJwtVerifier } from '../src/modules/auth/dev-jwt.verifier.js';

const SECRET = '0'.repeat(48);

function configMock(): ConfigService {
  return {
    get: (k: string): string | undefined =>
      (k === 'AUTH_DEV_SECRET' || k === 'AUTH_MODE' ? (k === 'AUTH_MODE' ? 'dev' : SECRET) : undefined),
  } as unknown as ConfigService;
}

async function issue(payload: Record<string, unknown> = {}): Promise<string> {
  return new SignJWT({
    email: 'a@b.com',
    'https://parshlo.com/user_id': '11111111-1111-1111-1111-111111111111',
    'https://parshlo.com/roles': ['BUYER'],
    'https://parshlo.com/permissions': [],
    ...payload,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject('dev|buyer')
    .setIssuer('parshlo-dev')
    .setAudience('parshlo-dev')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(SECRET));
}

describe('DevJwtVerifier', () => {
  it('verifies a well-formed token and returns roles + permissions', async () => {
    const verifier = new DevJwtVerifier(configMock());
    const token = await issue();
    const principal = await verifier.verify(token);
    expect(principal.userId).toBe('11111111-1111-1111-1111-111111111111');
    expect(principal.roles).toEqual(['BUYER']);
    expect(principal.permissions.length).toBeGreaterThan(0);
  });

  it('rejects tokens signed with a different secret', async () => {
    const verifier = new DevJwtVerifier(configMock());
    const token = await new SignJWT({ 'https://parshlo.com/user_id': 'x', 'https://parshlo.com/roles': ['BUYER'] })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject('dev|x')
      .setIssuer('parshlo-dev')
      .setAudience('parshlo-dev')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('1'.repeat(48)));
    await expect(verifier.verify(token)).rejects.toBeDefined();
  });

  it('rejects tokens with the wrong audience', async () => {
    const verifier = new DevJwtVerifier(configMock());
    const token = await new SignJWT({ 'https://parshlo.com/user_id': 'x', 'https://parshlo.com/roles': ['BUYER'] })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject('dev|x')
      .setIssuer('parshlo-dev')
      .setAudience('different')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(SECRET));
    await expect(verifier.verify(token)).rejects.toBeDefined();
  });
});
