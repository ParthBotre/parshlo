import { NextResponse } from 'next/server';

import { clearSessionCookie } from '@/lib/auth/session';

export async function POST(): Promise<Response> {
  if (process.env.AUTH_MODE === 'dev') {
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Auth0 logout is handled by middleware.' }, { status: 404 });
}

export async function GET(): Promise<Response> {
  if (process.env.AUTH_MODE === 'dev') {
    await clearSessionCookie();
    return NextResponse.redirect(new URL('/', process.env.WEB_BASE_URL ?? 'http://localhost:3000'));
  }
  return NextResponse.json({ error: 'Auth0 logout is handled by middleware.' }, { status: 404 });
}
