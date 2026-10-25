const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function migrate() {
    try {
        const result = await pool.query(
            "SELECT current_database() AS database_name"
        );

        console.log(
            "Connected to database:",
            result.rows[0].database_name
        );

        console.log("Migration setup verified.");
    } catch (error) {
        console.error("Migration setup failed:", error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

migrate();