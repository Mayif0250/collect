import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:5433/laptop_collect?sslmode=disable';

const isLocal =
  connectionString.includes('127.0.0.1') ||
  connectionString.includes('localhost') ||
  connectionString.includes('sslmode=disable');

const pool =
  globalForPrisma.pgPool ??
  new Pool({
    connectionString,
    ssl: !isLocal ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 10000,
  });

pool.on('error', (err) => {
  console.warn('PostgreSQL client pool error (auto-reconnecting):', err.message);
});

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pool;
}

export default prisma;
