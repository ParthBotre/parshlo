import path from 'node:path';

/**
 * Workspace packages that ship their own flat ESLint config. Order matters
 * only for readability; lookup uses an exact path-prefix match.
 */
const PACKAGES = [
  'apps/api',
  'apps/web',
  'apps/worker',
  'packages/db',
  'packages/logger',
  'packages/queue',
  'packages/telemetry',
  'packages/types',
];

const ROOT = process.cwd();

/** Test paths are linted by Jest, not type-checked ESLint (see @parshlo/config/eslint/test). */
const TEST_FILE = /(?:^|\/)(?:test|__tests__)(?:\/|$)|\.(?:spec|test)\.[cm]?[jt]sx?$/;

const toRel = (file) => path.relative(ROOT, file);

const findPackage = (relFile) =>
  PACKAGES.find((pkg) => relFile === pkg || relFile.startsWith(`${pkg}${path.sep}`));

const isLintableSource = (relFile) => !TEST_FILE.test(relFile);

const quote = (file) => JSON.stringify(file);

export default {
  '*.{ts,tsx,js,jsx,mjs,cjs}': (absFiles) => {
    const relFiles = absFiles.map(toRel);
    const commands = [`prettier --write ${relFiles.map(quote).join(' ')}`];

    const byPackage = new Map();
    for (const file of relFiles) {
      if (!isLintableSource(file)) {
        continue;
      }
      const pkg = findPackage(file);
      if (!pkg) {
        continue;
      }
      if (!byPackage.has(pkg)) {
        byPackage.set(pkg, []);
      }
      byPackage.get(pkg).push(file);
    }

    for (const [pkg, files] of byPackage) {
      const args = files.map(quote).join(' ');
      const configPath = `${pkg}/eslint.config.mjs`;
      commands.push(
        `eslint --config ${configPath} --no-config-lookup --no-warn-ignored --fix --max-warnings=0 ${args}`,
      );
    }

    return commands;
  },
  '*.{json,md,yml,yaml,css}': ['prettier --write'],
};
