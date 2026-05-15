import { handleLogin } from '@auth0/nextjs-auth0';

import { auth0AuthorizationParams } from '@/lib/auth/auth0-config';

export const GET = handleLogin({
  authorizationParams: auth0AuthorizationParams,
});
