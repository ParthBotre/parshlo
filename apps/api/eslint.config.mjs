import node from '@parshlo/config/eslint/node';
import test from '@parshlo/config/eslint/test';

export default [
  ...node,
  {
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  ...test,
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
