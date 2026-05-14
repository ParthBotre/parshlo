import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  DEV_PERSONAS,
  type DevPersona,
  issueDevAccessToken,
  setSessionCookie,
} from '@/lib/auth/session';

/**
 * Dev-only sign-in endpoint. Disabled when AUTH_MODE !== 'dev'.
 * Issues a short-lived HS256 token impersonating a seeded persona.
 */
const Body = z.object({
  persona: z.enum(['admin', 'buyer']),
  redirectTo: z.string().optional(),
});

export async function POST(req: Request): Promise<Response> {
  if (process.env.AUTH_MODE !== 'dev') {
    return NextResponse.json(
      { error: 'Dev login is disabled in this environment.' },
      { status: 403 },
    );
  }
  let body: z.infer<typeof Body>;
  try {
    const json = (await req.json()) as unknown;
    body = Body.parse(json);
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const persona: DevPersona = body.persona;
  const p = DEV_PERSONAS[persona];

  // Resolve the internal user id from the API via a dev-only endpoint.
  const apiBase = process.env.API_BASE_URL ?? 'http://localhost:4000';
  let userId: string = p.userId;
  try {
    const res = await fetch(`${apiBase}/v1/auth/dev/resolve?email=${encodeURIComponent(p.email)}`, {
      headers: { 'X-Dev-Auth-Secret': process.env.AUTH_DEV_SECRET ?? '' },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = (await res.json()) as { id?: string };
      if (typeof data.id === 'string') {
        userId = data.id;
      }
    }
  } catch {
    // Fall through with placeholder — API may still resolve on token verify if it stores by email.
  }

  const { token, expiresAt } = await issueDevAccessToken({
    userId,
    auth0Id: p.auth0Id,
    email: p.email,
    fullName: p.fullName,
    roles: [...p.roles],
  });
  await setSessionCookie(token, expiresAt - Math.floor(Date.now() / 1000));

  const redirect = body.redirectTo ?? (persona === 'admin' ? '/admin' : '/dashboard');
  return NextResponse.json({ ok: true, redirectTo: redirect });
}
