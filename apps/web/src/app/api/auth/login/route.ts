import { handleLogin } from '@auth0/nextjs-auth0';
import { type NextRequest } from 'next/server';

import { type Auth0LoginPrompt, buildAuth0AuthorizationParams } from '@/lib/auth/auth0-config';

interface RouteContext {
  params: Record<string, string | string[]>;
}

export async function GET(req: NextRequest, ctx: RouteContext): Promise<Response> {
  const promptParam = req.nextUrl.searchParams.get('prompt');
  const prompt: Auth0LoginPrompt | undefined =
    promptParam === 'login' || promptParam === 'select_account' ? promptParam : undefined;

  const handler = handleLogin({
    authorizationParams: buildAuth0AuthorizationParams(prompt),
  });

  return handler(req, ctx);
}
