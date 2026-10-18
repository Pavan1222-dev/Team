import express from 'express';
import healthRoutes from './routes/health-routes.js';
import { notFound } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';
import { createBooksRouter } from './routes/books.routes.js';
import { createMembersRouter } from './routes/members.routes.js';

// Keeping app construction separate lets tests import the HTTP app without opening a port.
export function createApp({ database } = {}) {
  const app = express();

  app.use(express.json());
  app.use(healthRoutes);
  if (database) {
    app.use('/api', createBooksRouter(database));
    app.use('/api', createMembersRouter(database));
  }
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

const app = createApp();

export default app;
