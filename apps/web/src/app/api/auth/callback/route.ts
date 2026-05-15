import { handleCallback } from '@auth0/nextjs-auth0';
import { type NextRequest, NextResponse } from 'next/server';

import { signInRedirectUrl } from '@/lib/auth/auth0-errors';

interface RouteContext {
  params: Record<string, string | string[]>;
}

// Must pass an options object (even `{}`) so the SDK returns a route handler.
const authCallback = handleCallback({});

export async function GET(req: NextRequest, ctx: RouteContext): Promise<Response> {
  const oauthError = req.nextUrl.searchParams.get('error');
  if (oauthError) {
    const description = req.nextUrl.searchParams.get('error_description') ?? undefined;
    return NextResponse.redirect(
      signInRedirectUrl(req.url, {
        error: oauthError,
        error_description: description,
      }),
    );
  }

  try {
    return await authCallback(req, ctx);
  } catch {
    return NextResponse.redirect(
      signInRedirectUrl(req.url, {
        error: 'auth_callback_failed',
        error_description: 'Could not complete sign-in. Please try again.',
      }),
    );
  }
}
