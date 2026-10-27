import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

async function migrate() {
  console.log('--- Connecting to Neon PostgreSQL ---');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to Neon successfully!');

  const migrationPath = path.join(process.cwd(), 'prisma', 'migrations', '0_init', 'migration.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Applying database schema to Neon...');
  await client.query(sql);
  console.log('✓ Migration applied successfully!');

  await client.end();
}

migrate().catch((err) => {
  // If tables already exist, report cleanly
  if (err.message && err.message.includes('already exists')) {
    console.log('✓ Schema already applied to Neon database.');
  } else {
    console.error('Migration error:', err);
    process.exit(1);
  }
});
