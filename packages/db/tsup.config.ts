import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  // Avoid wiping dist on every watch rebuild — breaks @parshlo/api types mid-compile.
  clean: false,
  target: 'node22',
  splitting: false,
  external: ['@prisma/client'],
});
