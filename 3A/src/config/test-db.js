import pool from './db.js';

try {
  const result = await pool.query('SELECT current_database() AS database');
  console.log(`PostgreSQL connection is ready (database: ${result.rows[0].database}).`);
} catch {
  console.error('PostgreSQL connection check failed. Verify the local service and .env settings.');
  process.exitCode = 1;
} finally {
  await pool.end();
}
