import { Auth0Client } from '@auth0/nextjs-auth0/server';

import { buildAuth0AuthorizationParams } from './auth0-config';

function auth0Domain(): string | undefined {
  if (process.env.AUTH0_DOMAIN) {
    return process.env.AUTH0_DOMAIN;
  }
  return process.env.AUTH0_ISSUER_BASE_URL?.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export const auth0 = new Auth0Client({
  domain: auth0Domain(),
  appBaseUrl: process.env.APP_BASE_URL ?? process.env.AUTH0_BASE_URL ?? process.env.WEB_BASE_URL,
  authorizationParameters: buildAuth0AuthorizationParams(),
  routes: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    callback: '/api/auth/callback',
    backChannelLogout: '/api/auth/backchannel-logout',
    profile: '/api/auth/profile',
    accessToken: '/api/auth/access-token',
  },
});
