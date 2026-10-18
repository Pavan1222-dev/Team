import express from 'express';
import pinoHttp from 'pino-http';
import { logger } from './utils/logger.js';
import { createCompareController } from './controllers/compare.controller.js';
import { createCityController } from './controllers/city.controller.js';
import { createCityRouter } from './routes/city.routes.js';
import { createCompareService } from './services/compare.service.js';
import { createCityService } from './services/city.service.js';

export function createApp({ cityService = createCityService() } = {}) {
  const app = express();
  const compareService = createCompareService(cityService);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.use(pinoHttp({ logger }));

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.use(createCityRouter(createCityController(cityService), createCompareController(compareService)));

  app.use((_request, response) => {
    response.status(404).json({ error: 'Route not found.' });
  });

  app.use((error, _request, response, _next) => {
    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
    if (statusCode >= 500) logger.error({ err: error }, 'Request failed');
    const message = statusCode >= 500 ? 'The city data service is temporarily unavailable.' : error.message;
    response.status(statusCode).json({ error: message });
  });

  return app;
}
