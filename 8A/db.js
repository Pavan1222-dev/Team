
const Database = require("better-sqlite3");

// Create or open the database file
const db = new Database("reports.db");

// Create sales table
db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product TEXT,
        amount REAL,
        sale_date TEXT
    )
`);

// Create tasks table
db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_name TEXT,
        status TEXT
    )
`);

// Create schedules table
db.exec(`
    CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_type TEXT,
        cron_expression TEXT,
        recipients TEXT,
        format TEXT,
        paused INTEGER DEFAULT 0
    )
`);

// Create run history table
db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        schedule_id INTEGER,
        start_time TEXT,
        end_time TEXT,
        status TEXT,
        error_message TEXT
    )
`);

// Insert sample sales only when the table is empty
const salesCount = db.prepare(
    "SELECT COUNT(*) AS count FROM sales"
).get();

if (salesCount.count === 0) {
    const insertSale = db.prepare(`
        INSERT INTO sales (product, amount, sale_date)
        VALUES (?, ?, ?)
    `);

    insertSale.run("Laptop", 50000, "2026-10-23");
    insertSale.run("Mouse", 1000, "2026-10-23");
    insertSale.run("Keyboard", 2500, "2026-10-22");

    console.log("Sample sales inserted");
}

// Insert sample tasks only when the table is empty
const tasksCount = db.prepare(
    "SELECT COUNT(*) AS count FROM tasks"
).get();

if (tasksCount.count === 0) {
    const insertTask = db.prepare(`
        INSERT INTO tasks (task_name, status)
        VALUES (?, ?)
    `);

    insertTask.run("Complete billing portal", "pending");
    insertTask.run("Prepare sales report", "pending");
    insertTask.run("Test email service", "completed");

    console.log("Sample tasks inserted");
}

console.log("Database initialized successfully");

module.exports = db;
