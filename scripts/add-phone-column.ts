import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pool.query('ALTER TABLE "LaptopRecord" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;');
    console.log('✅ Column phoneNumber successfully added to LaptopRecord table in PostgreSQL!');
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
