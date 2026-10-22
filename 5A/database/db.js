// Database setup will be added here.
const Database = require('better-sqlite3')
const path = require('path')

const dbPath = path.join(__dirname, "chat.db");
const db = new Database(dbPath)

db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room TEXT NOT NULL,
        sender TEXT NOT NULL,
        recipient TEXT,
        message TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'room',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);


console.log("SQLite database connected successfully");

module.exports = db;