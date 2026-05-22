import { jwtVerify } from 'jose';
import { type NextRequest, NextResponse } from 'next/server';

import { auth0 } from '@/lib/auth/auth0';

/**
 * Edge middleware: gate /dashboard/* and /admin/* (ADMIN family roles).
 */

const SESSION_COOKIE = 'parshlo_session';
const DEV_ISSUER = 'parshlo-dev';
const DEV_AUDIENCE = 'parshlo-dev';
const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'SALES_MANAGER']);

function parseStringRoles(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  if (!value.every((role): role is string => typeof role === 'string')) {
    return null;
  }
  return value;
}

async function readDevSession(req: NextRequest): Promise<{ roles: string[] } | null> {
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) {
    return null;
  }
  const secret = process.env.AUTH_DEV_SECRET;
  if (!secret) {
    return null;
  }
  try {
    const { payload } = await jwtVerify(raw, new TextEncoder().encode(secret), {
      issuer: DEV_ISSUER,
      audience: DEV_AUDIENCE,
    });
    const roles = parseStringRoles(payload['https://parshlo.com/roles']);
    if (roles) {
      return { roles };
    }
  } catch {
    return null;
  }
  return null;
}

async function readAuth0Session(req: NextRequest): Promise<{ roles: string[] } | null> {
  try {
    const session = await auth0.getSession(req);
    if (!session?.user) {
      return null;
    }
    const roles = parseStringRoles(session.user['https://parshlo.com/roles']);
    if (roles) {
      return { roles };
    }
    // Auth0 session without custom claims — authenticated, roles enforced by API.
    return { roles: [] };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  const authRoute = pathname.startsWith('/api/auth');
  const protectedDashboard = pathname.startsWith('/dashboard');
  const protectedAdmin = pathname.startsWith('/admin');

  if (process.env.AUTH_MODE !== 'dev') {
    const authResponse = await auth0.middleware(req);
    if (authRoute) {
      return authResponse;
    }
    if (!protectedDashboard && !protectedAdmin) {
      return authResponse;
    }
  } else if (!protectedDashboard && !protectedAdmin) {
    return NextResponse.next();
  }

  const session =
    process.env.AUTH_MODE === 'dev' ? await readDevSession(req) : await readAuth0Session(req);

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth/sign-in';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (
    protectedAdmin &&
    process.env.AUTH_MODE === 'dev' &&
    !session.roles.some((r) => ADMIN_ROLES.has(r))
  ) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    url.searchParams.set('error', 'forbidden');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/api/auth/:path*',
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|apple-icon.png|icon.png|opengraph-image.png).*)',
  ],
};
