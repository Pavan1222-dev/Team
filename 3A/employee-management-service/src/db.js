import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// A pool reuses database connections instead of opening one for every request.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (error) => console.error('Unexpected idle PostgreSQL client error:', error));
