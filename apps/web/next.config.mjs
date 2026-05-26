import { withSentryConfig } from '@sentry/nextjs';
import { PHASE_PRODUCTION_BUILD } from 'next/constants.js';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compiler: {
    // Strip console.* from client bundles in production — API traffic must not leak.
    removeConsole: process.env.NODE_ENV === 'production',
  },
  eslint: {
    // `pnpm lint` runs ESLint as a separate CI gate. Next's deprecated
    // build-time linter misdetects our shared flat config and emits noise.
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['@parshlo/types'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.amazonaws.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

function withProductionWebpackWarningFilters(config) {
  return {
    ...config,
    webpack(webpackConfig) {
      webpackConfig.ignoreWarnings = [
        ...(webpackConfig.ignoreWarnings ?? []),
        {
          module: /@auth0[\\/]nextjs-auth0[\\/]dist[\\/]utils[\\/]dpopUtils\.js/,
          message: /Critical dependency: the request of a dependency is an expression/,
        },
        {
          module: /require-in-the-middle/,
          message: /Critical dependency: require function is used/,
        },
      ];
      return webpackConfig;
    },
  };
}

function withSentry(config) {
  const enabled = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN);
  if (!enabled) {
    return config;
  }

  return withSentryConfig(config, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: true,
    webpack: {
      treeshake: {
        removeDebugLogging: true,
      },
    },
  });
}

export default function config(phase) {
  if (phase === PHASE_PRODUCTION_BUILD) {
    return withSentry(withProductionWebpackWarningFilters(nextConfig));
  }

  return withSentry(nextConfig);
}
