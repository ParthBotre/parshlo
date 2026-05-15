import { type Role } from '@parshlo/types';
import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import 'server-only';

/**
 * Parshlo session model.
 *
 * Two providers are supported behind the same interface:
 *   1. AUTH_MODE=auth0   → @auth0/nextjs-auth0 (handled in app/api/auth/[...auth0]).
 *   2. AUTH_MODE=dev     → HS256 token signed by AUTH_DEV_SECRET, stored in an
 *      httpOnly cookie. The API verifies the same token with the same secret.
 *
 * The dev mode unlocks the entire B2B flow (sign-in, dashboards, place orders,
 * admin actions) without an Auth0 tenant — critical for local development,
 * CI, Playwright tests, and resume-demo recordings.
 */

const SESSION_COOKIE = 'parshlo_session';
const ISSUER = 'parshlo-dev';
const AUDIENCE = 'parshlo-dev';

export interface Session {
  /** Bearer token to send to the NestJS API. */
  accessToken: string;
  user: {
    auth0Id: string;
    userId: string;
    email: string;
    fullName: string;
    roles: Role[];
  };
  expiresAt: number;
}

function devSecret(): Uint8Array {
  const secret = process.env.AUTH_DEV_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_DEV_SECRET is missing or too short (≥32 chars). Required for dev auth mode.',
    );
  }
  return new TextEncoder().encode(secret);
}

/** Sign an HS256 token for a known dev user. */
export async function issueDevAccessToken(opts: {
  userId: string;
  auth0Id: string;
  email: string;
  fullName: string;
  roles: Role[];
  ttlSec?: number;
}): Promise<{ token: string; expiresAt: number }> {
  const now = Math.floor(Date.now() / 1000);
  const ttl = opts.ttlSec ?? 60 * 60 * 8; // 8h
  const exp = now + ttl;
  const token = await new SignJWT({
    email: opts.email,
    email_verified: true,
    'https://parshlo.com/user_id': opts.userId,
    'https://parshlo.com/roles': opts.roles,
    'https://parshlo.com/permissions': [],
    'https://parshlo.com/full_name': opts.fullName,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(opts.auth0Id)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(devSecret());
  return { token, expiresAt: exp };
}

/** Read the current session from the cookie, validating the JWT. */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) {
    return null;
  }
  try {
    const { payload } = await jwtVerify(raw, devSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    const sub = payload.sub;
    const userId = payload['https://parshlo.com/user_id'];
    const roles = payload['https://parshlo.com/roles'];
    const email = payload.email;
    const fullName = payload['https://parshlo.com/full_name'];
    if (
      typeof sub !== 'string' ||
      typeof userId !== 'string' ||
      typeof email !== 'string' ||
      typeof fullName !== 'string' ||
      !Array.isArray(roles)
    ) {
      return null;
    }
    return {
      accessToken: raw,
      user: {
        auth0Id: sub,
        userId,
        email,
        fullName,
        roles: roles as Role[],
      },
      expiresAt: typeof payload.exp === 'number' ? payload.exp : 0,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string, maxAgeSec: number): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSec,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Dev demo personas — provisioned by the API seed script. */
export const DEV_PERSONAS = {
  admin: {
    auth0Id: 'dev|admin',
    userId: '__dev_admin__', // resolved from DB by /api/auth/dev-login
    email: 'admin@parshlo.local',
    fullName: 'Parshlo Admin',
    roles: ['ADMIN'] as Role[],
  },
  buyer: {
    auth0Id: 'dev|buyer',
    userId: '__dev_buyer__',
    email: 'buyer@parshlo.local',
    fullName: 'Demo Buyer (Apex Pharmacy)',
    roles: ['BUYER'] as Role[],
  },
} as const;

export type DevPersona = keyof typeof DEV_PERSONAS;
