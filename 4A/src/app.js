import express from 'express';
import pinoHttp from 'pino-http';
import { logger } from './utils/logger.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.use(pinoHttp({ logger }));

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.use((_request, response) => {
    response.status(404).json({ error: 'Route not found.' });
  });

  app.use((error, _request, response, _next) => {
    logger.error({ err: error }, 'Request failed');
    response.status(500).json({ error: 'Internal server error.' });
  });

  return app;
}
