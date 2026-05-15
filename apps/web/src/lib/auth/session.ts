import { getAccessToken, getSession as getAuth0Session } from '@auth0/nextjs-auth0';
import { PublicUser, Role, type Role as RoleType } from '@parshlo/types';
import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { z } from 'zod';
import 'server-only';

import { apiCall, ApiError } from '../api-client';

/**
 * Parshlo session model.
 *
 * Two providers are supported behind the same interface:
 *   1. AUTH_MODE=auth0   → @auth0/nextjs-auth0 session + API access token
 *   2. AUTH_MODE=dev     → HS256 token signed by AUTH_DEV_SECRET
 */

const SESSION_COOKIE = 'parshlo_session';
const DEV_ISSUER = 'parshlo-dev';
const DEV_AUDIENCE = 'parshlo-dev';

const SyncUser = z.object({
  userId: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  roles: z.array(Role),
  accountStatus: z.string(),
});

export interface Session {
  accessToken: string;
  user: {
    auth0Id: string;
    userId: string;
    email: string;
    fullName: string;
    roles: RoleType[];
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

export async function issueDevAccessToken(opts: {
  userId: string;
  auth0Id: string;
  email: string;
  fullName: string;
  roles: RoleType[];
  ttlSec?: number;
}): Promise<{ token: string; expiresAt: number }> {
  const now = Math.floor(Date.now() / 1000);
  const ttl = opts.ttlSec ?? 60 * 60 * 8;
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
    .setIssuer(DEV_ISSUER)
    .setAudience(DEV_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(devSecret());
  return { token, expiresAt: exp };
}

async function getDevSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) {
    return null;
  }
  try {
    const { payload } = await jwtVerify(raw, devSecret(), {
      issuer: DEV_ISSUER,
      audience: DEV_AUDIENCE,
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
        roles: roles as RoleType[],
      },
      expiresAt: typeof payload.exp === 'number' ? payload.exp : 0,
    };
  } catch {
    return null;
  }
}

async function fetchParshloProfile(
  accessToken: string,
  auth0User?: { email?: string },
): Promise<{
  id: string;
  email: string;
  fullName: string;
  roles: RoleType[];
}> {
  try {
    const me = await apiCall('/v1/users/me', PublicUser, {
      accessToken,
      cache: 'no-store',
    });
    return {
      id: me.id,
      email: me.email,
      fullName: me.fullName,
      roles: me.roles,
    };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      const sessionEmail = typeof auth0User?.email === 'string' ? auth0User.email : undefined;
      const synced = await apiCall('/v1/auth/sync', SyncUser, {
        method: 'POST',
        accessToken,
        body: sessionEmail ? { email: sessionEmail } : undefined,
        cache: 'no-store',
      });
      return {
        id: synced.userId,
        email: synced.email,
        fullName: synced.fullName,
        roles: synced.roles,
      };
    }
    throw err;
  }
}

async function getAuth0ParshloSession(): Promise<Session | null> {
  const auth0Session = await getAuth0Session();
  if (!auth0Session?.user) {
    return null;
  }

  let accessToken: string | undefined;
  try {
    const tokenResult = await getAccessToken({ refresh: true });
    accessToken = tokenResult.accessToken;
  } catch {
    try {
      const tokenResult = await getAccessToken();
      accessToken = tokenResult.accessToken;
    } catch {
      return null;
    }
  }
  if (!accessToken) {
    return null;
  }

  const auth0SubUnknown: unknown = auth0Session.user.sub;
  if (typeof auth0SubUnknown !== 'string') {
    return null;
  }
  const auth0Sub = auth0SubUnknown;

  try {
    const profile = await fetchParshloProfile(accessToken, auth0Session.user);
    return {
      accessToken,
      user: {
        auth0Id: auth0Sub,
        userId: profile.id,
        email: profile.email,
        fullName: profile.fullName,
        roles: profile.roles,
      },
      expiresAt: 0,
    };
  } catch {
    return null;
  }
}

/** Read the current session (dev cookie or Auth0 + API profile). */
export async function getSession(): Promise<Session | null> {
  if (process.env.AUTH_MODE === 'dev') {
    return getDevSession();
  }
  return getAuth0ParshloSession();
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

export const DEV_PERSONAS = {
  admin: {
    auth0Id: 'dev|admin',
    userId: '__dev_admin__',
    email: 'admin@parshlo.local',
    fullName: 'Parshlo Admin',
    roles: ['ADMIN'] as RoleType[],
  },
  buyer: {
    auth0Id: 'dev|buyer',
    userId: '__dev_buyer__',
    email: 'buyer@parshlo.local',
    fullName: 'Demo Buyer (Apex Pharmacy)',
    roles: ['BUYER'] as RoleType[],
  },
} as const;

export type DevPersona = keyof typeof DEV_PERSONAS;
