import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5433/laptop_collect?sslmode=disable';

const isLocal = connectionString.includes('127.0.0.1') || connectionString.includes('localhost');

const pool =
  globalForPrisma.pgPool ??
  new Pool({
    connectionString,
    ssl: !isLocal && process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 15,
    idleTimeoutMillis: 30000,
  });

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pool;
}

export default prisma;
