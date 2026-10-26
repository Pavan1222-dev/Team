const express = require("express");
const { pool } = require("../db");

const router = express.Router();

router.get("/reports/headcount", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.name AS department, COUNT(e.id)::int AS headcount 
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id
      GROUP BY d.id, d.name
      ORDER BY headcount DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reports/on-leave-today", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.id, e.name, d.name AS department, l.start_date, l.end_date 
      FROM leave_requests l
      JOIN employees e ON l.employee_id = e.id
      JOIN departments d ON e.department_id = d.id
      WHERE l.status = 'APPROVED' 
      AND CURRENT_DATE BETWEEN l.start_date AND l.end_date
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reports/hierarchy/:employee_id", async (req, res) => {
  const { employee_id } = req.params;

  try {
    const result = await pool.query(
      `
      WITH RECURSIVE hierarchy AS (        SELECT id, name, manager_id, 1 AS level
        FROM employees
        WHERE id = $1
        
        UNION ALL        SELECT e.id, e.name, e.manager_id, h.level + 1
        FROM employees e
        JOIN hierarchy h ON h.manager_id = e.id
      )
      SELECT * FROM hierarchy ORDER BY level ASC;
    `,
      [employee_id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
