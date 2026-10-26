import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sqlite3 from 'sqlite3';

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));
const databasePath = path.join(projectDirectory, 'data', 'urls.sqlite');
let database;

function run(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    database.run(sql, parameters, function onRun(error) {
      if (error) {
        reject(error);
      } else {
        resolve({ changes: this.changes, lastID: this.lastID });
      }
    });
  });
}

function get(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    database.get(sql, parameters, (error, row) => {
      if (error) reject(error);
      else resolve(row);
    });
  });
}

function all(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    database.all(sql, parameters, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

async function initializeDatabase() {
  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  database = await new Promise((resolve, reject) => {
    const connection = new sqlite3.Database(databasePath, (error) => {
      if (error) reject(error);
      else resolve(connection);
    });
  });

  await run('PRAGMA foreign_keys = ON');
  await run(`
    CREATE TABLE IF NOT EXISTS urls (
      short_code TEXT PRIMARY KEY,
      original_url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      short_code TEXT NOT NULL REFERENCES urls(short_code) ON DELETE CASCADE,
      clicked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      referrer TEXT,
      user_agent TEXT
    )
  `);
}

function getDatabase() {
  if (!database) {
    throw new Error('Database has not been initialized.');
  }
  return { all, get, run };
}

export { getDatabase, initializeDatabase };
