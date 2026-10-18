import { createApp } from './app.js';
import { config } from './config.js';
import { createDatabase } from './db/database.js';

async function startServer() {
  // Do not accept requests until the schema is ready; fail startup clearly if it is not.
  const database = await createDatabase(config.databasePath);

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`Library API listening on port ${config.port}`);
  });

  const shutdown = () => {
    server.close((error) => {
      if (error) {
        console.error('Error while closing the HTTP server:', error);
        process.exitCode = 1;
      }

      database.close().catch((closeError) => {
        console.error('Error while closing the database:', closeError);
        process.exitCode = 1;
      });
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

startServer().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
