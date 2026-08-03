const action = process.argv[2] ?? 'database action';
const databaseUrl = process.env.DATABASE_URL;
const appEnv = (process.env.APP_ENV ?? process.env.NODE_ENV ?? process.env.VERCEL_ENV ?? '')
  .trim()
  .toLowerCase();

const allowedHosts = new Set(['localhost', '127.0.0.1', '::1', 'postgres', 'host.docker.internal']);

function fail(message) {
  console.error(`Refusing to run ${action}: ${message}`);
  console.error('This guard prevents staging/production data loss.');
  console.error('For local development only, use a localhost DATABASE_URL.');
  process.exit(1);
}

if (!databaseUrl) {
  fail('DATABASE_URL is not set.');
}

if (['production', 'prod', 'staging', 'stage'].includes(appEnv)) {
  fail(`APP_ENV/NODE_ENV/VERCEL_ENV is "${appEnv}".`);
}

let host;
try {
  host = new URL(databaseUrl).hostname;
} catch {
  fail('DATABASE_URL is not a valid URL.');
}

if (!allowedHosts.has(host) && process.env.ALLOW_DESTRUCTIVE_DB !== 'true') {
  fail(`database host "${host}" is not a local development host.`);
}

console.log(`Database guard passed for ${action} on ${host}.`);
