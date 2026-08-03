/**
 * Build-time feature flags for the web app.
 *
 * Flags are read from `NEXT_PUBLIC_*` environment variables so they're inlined
 * into the client bundle at build time — Next.js requires the `NEXT_PUBLIC_`
 * prefix for any env var that should reach the browser.
 *
 * To toggle a flag for a running dev server, edit `apps/web/.env.local` and
 * restart `pnpm dev` (env vars are baked in at boot for Next).
 */

/**
 * Pricing displayed in the UI + order placement enabled.
 * Defaults to on in development unless explicitly set to `false`.
 */
export const PRICING_ENABLED: boolean =
  process.env.NEXT_PUBLIC_PRICING_ENABLED === 'true' ||
  (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_PRICING_ENABLED !== 'false');
