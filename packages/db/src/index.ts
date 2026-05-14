import { PrismaClient } from '@prisma/client';

/**
 * Singleton Prisma client. The HMR-safe pattern below avoids exhausting the
 * connection pool when Next.js dev server reloads.
 */

declare global {
   
  var __parshloPrisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
  return client;
}

export const prisma: PrismaClient = globalThis.__parshloPrisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__parshloPrisma = prisma;
}

export * from '@prisma/client';
