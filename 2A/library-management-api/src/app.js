import express from 'express';
import { router } from './routes/library-routes.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.get('/api/v1/health', (req, res) => res.json({ success: true, data: { status: 'ok' }, error: null }));
app.use('/api/v1', router);
app.use(notFoundHandler);
app.use(errorHandler);
