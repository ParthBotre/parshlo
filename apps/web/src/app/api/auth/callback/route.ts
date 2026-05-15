import { handleCallback } from '@auth0/nextjs-auth0';

// Must pass an options object (even `{}`) so the SDK returns a route handler instead of
// treating `undefined` as a Request (which throws on `.headers`).
export const GET = handleCallback({});
