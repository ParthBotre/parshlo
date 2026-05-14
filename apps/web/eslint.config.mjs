import next from '@parshlo/config/eslint/next';

export default [
  ...next,
  {
    rules: {
      // Next.js Link components handle internal routing; allow plain <a> for
      // external links without forcing next/link migrations.
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
];
