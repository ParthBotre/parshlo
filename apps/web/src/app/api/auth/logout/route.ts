import { NextResponse } from 'next/server';

import { clearSessionCookie } from '@/lib/auth/session';

export async function POST(): Promise<Response> {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}

export async function GET(): Promise<Response> {
  await clearSessionCookie();
  return NextResponse.redirect(new URL('/', process.env.WEB_BASE_URL ?? 'http://localhost:3000'));
}
