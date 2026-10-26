import fs from "node:fs";
import sqlite3 from "sqlite3";

// Keep the database file in the data folder.
fs.mkdirSync("data", { recursive: true });
const database = new sqlite3.Database("data/library.sqlite");
let operationQueue = Promise.resolve();

// Run database operations one at a time so a transaction cannot be interrupted.
function enqueue(operation) {
  const result = operationQueue.then(operation);
  operationQueue = result.catch(() => {});
  return result;
}

// Turn sqlite3 callbacks into promises so services can use async/await.
function runRaw(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    database.run(sql, parameters, function onRun(error) {
      if (error) {
        reject(error);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

function getRaw(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    database.get(sql, parameters, (error, row) => {
      if (error) {
        reject(error);
      } else {
        resolve(row);
      }
    });
  });
}

function allRaw(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    database.all(sql, parameters, (error, rows) => {
      if (error) {
        reject(error);
      } else {
        resolve(rows);
      }
    });
  });
}

export function run(sql, parameters) {
  return enqueue(() => runRaw(sql, parameters));
}

export function get(sql, parameters) {
  return enqueue(() => getRaw(sql, parameters));
}

export function all(sql, parameters) {
  return enqueue(() => allRaw(sql, parameters));
}

// Keep related database updates together, for example issuing a book and
// reducing its available copy count.
export function transaction(work) {
  return enqueue(async () => {
    await runRaw('BEGIN IMMEDIATE');
    const tx = { run: runRaw, get: getRaw, all: allRaw };

    try {
      const result = await work(tx);
      await runRaw('COMMIT');
      return result;
    } catch (error) {
      await runRaw('ROLLBACK');
      throw error;
    }
  });
}

// Create the three tables the library uses when the server starts.
export async function initializeDatabase() {
  await run("PRAGMA foreign_keys = ON");
  await run(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      isbn TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      total_copies INTEGER NOT NULL CHECK (total_copies >= 0),
      available_copies INTEGER NOT NULL CHECK (
        available_copies >= 0 AND available_copies <= total_copies
      )
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE UNIQUE,
      phone TEXT NOT NULL,
      membership_type TEXT NOT NULL
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
      issued_at TEXT NOT NULL,
      due_at TEXT NOT NULL,
      returned_at TEXT,
      late_fee INTEGER NOT NULL DEFAULT 0 CHECK (late_fee >= 0)
    )
  `);
}
