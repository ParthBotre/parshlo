import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: !options.watch,
  target: 'es2022',
  splitting: false,
  treeshake: true,
  minify: false,
}));
