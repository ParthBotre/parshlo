import { PrismaClient } from '@prisma/client';

/**
 * Singleton Prisma client. The HMR-safe pattern below avoids exhausting the
 * connection pool when Next.js dev server reloads.
 */

const globalForPrisma = globalThis as typeof globalThis & {
  __parshloPrisma?: PrismaClient;
};

function createClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
  return client;
}

export const prisma: PrismaClient = globalForPrisma.__parshloPrisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__parshloPrisma = prisma;
}

export * from '@prisma/client';
