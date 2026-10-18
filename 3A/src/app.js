import express from 'express';

export function createApp({ database } = {}) {
  const app = express();

  app.use(express.json());

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.get('/health/db', async (_request, response, next) => {
    try {
      if (!database) {
        const error = new Error('Database health check failed.');
        error.status = 503;
        error.safeMessage = 'Database health check failed.';
        throw error;
      }
      const result = await database.query('SELECT current_database() AS database');
      response.json({ status: 'ok', database: result.rows[0].database });
    } catch {
      const error = new Error('Database health check failed.');
      error.status = 503;
      error.safeMessage = 'Database health check failed.';
      next(error);
    }
  });

  app.use((_request, response) => {
    response.status(404).json({ error: 'Route not found.' });
  });

  app.use((error, _request, response, _next) => {
    const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
      ? error.status
      : 500;
    response.status(status).json({
      error: status >= 500 ? (error.safeMessage ?? 'Internal server error.') : error.message,
    });
  });

  return app;
}

export default createApp();
