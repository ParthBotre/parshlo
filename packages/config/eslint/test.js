import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Glob patterns for unit/integration tests (relative to each package root).
 */
export const testFilePatterns = [
  'test/**/*.ts',
  '**/*.spec.ts',
  '**/*.test.ts',
  '**/__tests__/**/*.ts',
];

/**
 * ESLint flat-config slice for test files.
 * Type-checked rules are disabled here; Jest + tsconfig.spec.json own test typing.
 */
export default tseslint.config({
  files: testFilePatterns,
  extends: [tseslint.configs.disableTypeChecked],
  languageOptions: {
    globals: {
      ...globals.node,
      ...globals.jest,
    },
  },
  rules: {
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
  },
});
