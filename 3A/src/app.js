
const express = require("express");
require("dotenv").config();
const employeeRoutes = require("./routes/employeeRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const reportRoutes = require("./routes/reportRoutes");

const pool = require("./config/db");
const departmentRoutes = require("./routes/departmentRoutes");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "Employee Management Service is running"
    });
});

app.get("/health/db", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT current_database() AS database_name"
        );

        res.json({
            status: "connected",
            database: result.rows[0].database_name
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Database connection failed"
        });
    }
});

app.use("/api/departments", departmentRoutes);

const PORT = process.env.PORT || 3000;
app.use("/api/employees", employeeRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/reports", reportRoutes);

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
