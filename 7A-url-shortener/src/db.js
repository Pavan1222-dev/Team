const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const DB_SOURCE = 'database.sqlite';

async function initDB() {
  const db = await open({
    filename: DB_SOURCE,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS urls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      long_url TEXT NOT NULL,
      short_code TEXT UNIQUE NOT NULL,
      expiry_date TEXT
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      short_code TEXT NOT NULL,
      click_time TEXT NOT NULL,
      referrer TEXT,
      user_agent TEXT,
      FOREIGN KEY (short_code) REFERENCES urls(short_code)
    );
  `);

  return db;
}

module.exports = { initDB };
