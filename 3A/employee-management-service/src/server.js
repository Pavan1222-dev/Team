import 'dotenv/config';
import { app } from './app.js';
import { pool } from './db.js';

const port = Number(process.env.PORT ?? 3000);
const server = app.listen(port, () => console.log(`Employee service listening at http://localhost:${port}/api/v1`));

// Close HTTP and database connections cleanly when the process is stopped.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(async () => { await pool.end(); process.exit(0); }));
}
