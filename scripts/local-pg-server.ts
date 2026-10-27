import path from 'path';
import fs from 'fs';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const dataDir = path.join(process.cwd(), '.pgdata');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function main() {
  const db = new PGlite(dataDir);
  await db.waitReady;

  const port = parseInt(process.env.PGPORT || '5433', 10);
  const host = '127.0.0.1';

  const server = new PGLiteSocketServer({
    db,
    host,
    port,
  });

  await server.start();
  console.log(`Local PostgreSQL server running on ${host}:${port}`);
}

main().catch((err) => {
  console.error('Failed to start local postgres server:', err);
  process.exit(1);
});
