import fs from 'node:fs/promises';
import path from 'node:path';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { initializeSchema } from './schema.js';

export async function createDatabase(databasePath) {
  if (!databasePath) {
    throw new Error('A database path is required.');
  }

  if (databasePath !== ':memory:') {
    await fs.mkdir(path.dirname(path.resolve(databasePath)), { recursive: true });
  }

  const database = await open({ filename: databasePath, driver: sqlite3.Database });

  try {
    // SQLite does not enable referential checks by default; turn them on per connection.
    await database.exec('PRAGMA foreign_keys = ON');
    await initializeSchema(database);
    return database;
  } catch (error) {
    await database.close();
    throw new Error(`Failed to initialize the library database: ${error.message}`, { cause: error });
  }
}
