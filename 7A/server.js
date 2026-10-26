import { server } from './controller.js';
import { initializeDatabase } from './db.js';

const configuredPort = process.env.PORT;
const port = configuredPort === undefined ? 3000 : Number(configuredPort);

async function startServer() {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  await initializeDatabase();
  server.on('error', (error) => {
    console.error(`URL shortener could not listen on port ${port}:`, error);
    process.exitCode = 1;
  });
  server.listen(port, () => {
    console.info(`URL shortener listening on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error('URL shortener could not start:', error);
  process.exitCode = 1;
});
