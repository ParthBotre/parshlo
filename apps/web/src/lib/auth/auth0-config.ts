export type Auth0LoginPrompt = 'login' | 'select_account';

/**
 * Auth0 authorization parameters for `/api/auth/login`.
 *
 * `prompt: 'login'` avoids the “continue as previous email” step where declining
 * can leave Universal Login stuck with no redirect back to the app.
 */
export function buildAuth0AuthorizationParams(prompt?: Auth0LoginPrompt): {
  audience: string | undefined;
  scope: string;
  prompt?: Auth0LoginPrompt;
} {
  return {
    audience: process.env.AUTH0_AUDIENCE,
    scope: process.env.AUTH0_SCOPE ?? 'openid profile email',
    prompt: prompt ?? 'login',
  };
}

/** @deprecated Use `buildAuth0AuthorizationParams()` */
export const auth0AuthorizationParams = buildAuth0AuthorizationParams();
