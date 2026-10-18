import { createApp } from './app.js';
import pool from './config/db.js';

const port = Number(process.env.PORT) || 3000;
const app = createApp({ database: pool });
const server = app.listen(port, () => {
  console.log(`Employee Management API listening on port ${port}.`);
});

let isShuttingDown = false;

async function shutDown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`${signal} received; closing the HTTP server and database pool.`);

  server.close(async (error) => {
    if (error) {
      console.error('Failed to close the HTTP server cleanly.');
      process.exitCode = 1;
    }

    try {
      await pool.end();
    } catch {
      console.error('Failed to close the PostgreSQL pool cleanly.');
      process.exitCode = 1;
    }
  });
}

process.once('SIGINT', () => void shutDown('SIGINT'));
process.once('SIGTERM', () => void shutDown('SIGTERM'));

server.on('error', () => {
  console.error('The HTTP server could not start. Check whether the configured port is available.');
  process.exitCode = 1;
});
