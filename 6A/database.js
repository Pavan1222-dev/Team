
const Database = require("better-sqlite3");

const db = new Database("documents.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    type TEXT,
    tags TEXT,
    filename TEXT UNIQUE,
    originalname TEXT,
    mimetype TEXT,
    hash TEXT UNIQUE,
    size INTEGER,
    thumbnail TEXT,
    deleted_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

module.exports = db;
