import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const requiredSettings = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingSettings = requiredSettings.filter((setting) => !process.env[setting]?.trim());

if (missingSettings.length > 0) {
  throw new Error(`Missing required database environment settings: ${missingSettings.join(', ')}`);
}

const port = Number(process.env.DB_PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('DB_PORT must be an integer between 1 and 65535.');
}

export const pool = new Pool({
  host: process.env.DB_HOST,
  port,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.on('error', () => {
  console.error('Unexpected PostgreSQL pool error.');
});

export default pool;
