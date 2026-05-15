import { handleLogout } from '@auth0/nextjs-auth0';
import { type NextRequest, NextResponse } from 'next/server';

import { clearSessionCookie } from '@/lib/auth/session';

interface RouteContext {
  params: Record<string, string | string[]>;
}

const auth0Logout = handleLogout({});

export async function POST(req: NextRequest, ctx: RouteContext): Promise<Response> {
  if (process.env.AUTH_MODE === 'dev') {
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  }
  return auth0Logout(req, ctx);
}

export async function GET(req: NextRequest, ctx: RouteContext): Promise<Response> {
  if (process.env.AUTH_MODE === 'dev') {
    await clearSessionCookie();
    return NextResponse.redirect(new URL('/', process.env.WEB_BASE_URL ?? 'http://localhost:3000'));
  }
  return auth0Logout(req, ctx);
}
