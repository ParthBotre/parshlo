/** Shared Auth0 authorization parameters for login. */
export const auth0AuthorizationParams = {
  audience: process.env.AUTH0_AUDIENCE,
  scope: process.env.AUTH0_SCOPE ?? 'openid profile email',
};
