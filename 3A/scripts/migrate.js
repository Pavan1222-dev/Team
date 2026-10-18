import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from '../src/config/db.js';
import { runMigrationCommand } from './migration-runner.js';

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

try {
  await runMigrationCommand({
    pool,
    migrationsDirectory: path.join(projectDirectory, 'migrations'),
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
