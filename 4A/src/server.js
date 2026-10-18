import 'dotenv/config';
import { createApp } from './app.js';
import { logger } from './utils/logger.js';

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

const server = createApp().listen(port, () => {
  logger.info({ port }, 'Weather and currency API listening');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => {
      logger.info({ signal }, 'HTTP server stopped');
      process.exit(0);
    });
  });
}
