import express from 'express';
import { createDepartmentsRouter } from './routes/departments.routes.js';
import { createEmployeesRouter } from './routes/employees.routes.js';
import { errorHandler, notFound } from './middleware/error-handler.js';

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

  if (database) {
    app.use('/api/departments', createDepartmentsRouter(database));
    app.use('/api/employees', createEmployeesRouter(database));
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp();
