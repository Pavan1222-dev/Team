import { server } from './controller.js';
import { initializeDatabase } from './db.js';

const port = Number(process.env.PORT) || 3000;

async function startServer() {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  await initializeDatabase();
  server.listen(port, () => {
    console.info(`URL shortener listening on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error('URL shortener could not start:', error);
  process.exitCode = 1;
});
