import { describe, expect, it } from 'vitest';

import { AccessTokenClaims, Permission, Role, ROLE_PERMISSIONS } from '../auth.js';

describe('Role enum', () => {
  it('contains every expected role', () => {
    const expected = ['BUYER', 'SALES_MANAGER', 'ADMIN', 'SUPER_ADMIN'];
    for (const r of expected) {
      expect(Role.options).toContain(r);
    }
  });
});

describe('ROLE_PERMISSIONS', () => {
  it('SUPER_ADMIN has every permission', () => {
    const allPerms = Permission.options;
    const adminPerms = new Set(ROLE_PERMISSIONS.SUPER_ADMIN);
    for (const p of allPerms) {
      expect(adminPerms.has(p)).toBe(true);
    }
  });

  it('BUYER cannot approve KYC', () => {
    expect(ROLE_PERMISSIONS.BUYER).not.toContain('kyc:approve');
  });

  it('SALES_MANAGER cannot delete products', () => {
    expect(ROLE_PERMISSIONS.SALES_MANAGER).not.toContain('product:delete');
  });
});

describe('AccessTokenClaims', () => {
  it('parses a well-formed Auth0 access token payload', () => {
    const payload = {
      sub: 'auth0|abc123',
      email: 'buyer@example.com',
      email_verified: true,
      'https://parshlo.com/user_id': '11111111-1111-1111-1111-111111111111',
      'https://parshlo.com/roles': ['BUYER'],
      'https://parshlo.com/permissions': ['order:read_all'],
      iss: 'https://parshlo.us.auth0.com/',
      aud: 'https://api.parshlo.local',
      iat: 1_700_000_000,
      exp: 1_700_086_400,
    };
    const parsed = AccessTokenClaims.parse(payload);
    expect(parsed.sub).toBe('auth0|abc123');
    expect(parsed['https://parshlo.com/roles']).toEqual(['BUYER']);
  });

  it('accepts tokens missing the optional user_id claim', () => {
    const payload = {
      sub: 'auth0|abc',
      'https://parshlo.com/roles': ['BUYER'],
      iss: 'https://x.auth0.com/',
      aud: 'a',
      iat: 1,
      exp: 2,
    };
    expect(AccessTokenClaims.parse(payload)['https://parshlo.com/user_id']).toBeUndefined();
  });
});
