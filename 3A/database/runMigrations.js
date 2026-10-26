import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../src/config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationDir = path.join(__dirname, "migrations");

async function runMigrations() {
  try {
    const files = (await fs.readdir(migrationDir)).filter(file => file.endsWith(".sql")).sort();

    for (const file of files) {
      const fullPath = path.join(migrationDir, file);
      const sql = await fs.readFile(fullPath, "utf8");
      console.log(`Running migration: ${file}`);
      // PostgreSQL runs this SQL to create or update the database structure.
      await pool.query(sql);
    }

    console.log("All migrations completed successfully.");
  } catch (error) {
    console.error("Migration failed. Full error details:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runMigrations();
