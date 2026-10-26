import pg from 'pg';
import env from './env.js';

const { Pool } = pg;

// Share a connection pool so API operations can reuse PostgreSQL connections.
const pool = new Pool({
  host: env.pgHost,
  port: env.pgPort,
  user: env.pgUser,
  password: env.pgPassword,
  database: env.pgDatabase
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error.message);
});

export default pool;
