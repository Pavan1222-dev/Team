import express from 'express';
import multer from 'multer';
import documentRoutes from './routes/documentRoutes.js';
import { initializeDatabase } from './data_access/db.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use('/documents', documentRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Each file must be 5 MB or smaller.'
      : error.message;
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;

    return res.status(status).json({ error: message });
  }

  const status = error.status || 500;

  if (status >= 500) {
    console.error(error);
  }

  return res.status(status).json({
    error: status >= 500 ? 'An unexpected server error occurred.' : error.message
  });
});

async function startServer() {
  await initializeDatabase();

  app.listen(port, () => {
    console.log(`Document service is running at http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error('Could not start the document service:', error);
  process.exitCode = 1;
});