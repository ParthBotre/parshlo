import { jwtVerify } from 'jose';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Edge middleware: gate /dashboard/* (any role) and /admin/* (ADMIN family).
 * Uses the same HS256 session cookie that getSession() reads in RSC.
 *
 * NOTE: jose is edge-safe; jsonwebtoken would NOT be.
 */

const SESSION_COOKIE = 'parshlo_session';
const ISSUER = 'parshlo-dev';
const AUDIENCE = 'parshlo-dev';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'SALES_MANAGER']);

async function readSession(req: NextRequest): Promise<
  | {
      roles: string[];
    }
  | null
> {
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
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    const roles = payload['https://parshlo.com/roles'];
    if (Array.isArray(roles)) {
      return { roles: roles as string[] };
    }
  } catch {
    return null;
  }
  return null;
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  const protectedDashboard = pathname.startsWith('/dashboard');
  const protectedAdmin = pathname.startsWith('/admin');

  if (!protectedDashboard && !protectedAdmin) {
    return NextResponse.next();
  }

  const session = await readSession(req);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth/sign-in';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (protectedAdmin && !session.roles.some((r) => ADMIN_ROLES.has(r))) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    url.searchParams.set('error', 'forbidden');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
