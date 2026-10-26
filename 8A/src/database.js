import fs from 'node:fs/promises';
import path from 'node:path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import config from './config.js';

dayjs.extend(utc);
dayjs.extend(timezone);

let database;

function istTime(value = dayjs()) {
  return value.tz(config.timezone).format('YYYY-MM-DD HH:mm:ss');
}

async function initializeDatabase() {
  await fs.mkdir(path.dirname(config.databasePath), { recursive: true });
  database = await open({ filename: config.databasePath, driver: sqlite3.Database });

  await database.exec(`
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_type TEXT NOT NULL,
      cron_expression TEXT NOT NULL,
      recipients TEXT NOT NULL,
      format TEXT NOT NULL,
      is_paused INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL,
      sold_at TEXT NOT NULL,
      amount REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      due_at TEXT NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS run_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER NOT NULL,
      trigger_source TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      status TEXT NOT NULL,
      error_message TEXT,
      report_path TEXT
    );
  `);

  const sales = await database.get('SELECT COUNT(*) AS count FROM sales');
  if (sales.count === 0) {
    for (const [order, daysAgo, amount] of [
      ['ORD-1001', 2, 1299.5],
      ['ORD-1002', 1, 2499],
      ['ORD-1003', 0, 799.99]
    ]) {
      await database.run(
        'INSERT INTO sales (order_number, sold_at, amount) VALUES (?, ?, ?)',
        order,
        istTime(dayjs().subtract(daysAgo, 'day')),
        amount
      );
    }
  }

  const tasks = await database.get('SELECT COUNT(*) AS count FROM tasks');
  if (tasks.count === 0) {
    for (const [title, daysAhead, status] of [
      ['Prepare inventory summary', 1, 'pending'],
      ['Review supplier invoices', 3, 'pending'],
      ['Update product descriptions', 5, 'pending'],
      ['Archive completed campaign', 2, 'complete']
    ]) {
      await database.run(
        'INSERT INTO tasks (title, due_at, status) VALUES (?, ?, ?)',
        title,
        istTime(dayjs().add(daysAhead, 'day')),
        status
      );
    }
  }

  return database;
}

function getDatabase() {
  return database;
}

function nowInIst() {
  return istTime();
}

export { initializeDatabase, getDatabase, nowInIst };
