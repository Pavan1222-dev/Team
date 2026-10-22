import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const client = await pool.connect();
try {
  // Keep a ledger so migrations run once and can be safely rerun during setup.
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const files = (await readdir(path.join(root, 'migrations'))).filter((file) => file.endsWith('.sql')).sort();
  for (const filename of files) {
    const alreadyApplied = await client.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [filename]);
    if (alreadyApplied.rowCount) continue;
    await client.query('BEGIN');
    try {
      await client.query(await readFile(path.join(root, 'migrations', filename), 'utf8'));
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
      await client.query('COMMIT');
      console.log(`Applied ${filename}`);
    } catch (error) { await client.query('ROLLBACK'); throw error; }
  }
} finally { client.release(); await pool.end(); }
