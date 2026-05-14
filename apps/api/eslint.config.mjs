import node from '@parshlo/config/eslint/node';

export default [
  ...node,
  {
    rules: {
      // NestJS decorators rely on classes whose methods are technically
      // unused at the TS level. Suppress those false positives.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
];
