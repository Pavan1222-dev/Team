const express = require("express");
const { pool } = require("../db");

const router = express.Router();

router.get("/employees/search", async (req, res) => {
  const { name, department, start_date, end_date } = req.query;

  let query = `
    SELECT e.*, d.name as department_name 
    FROM employees e
    JOIN departments d ON e.department_id = d.id
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (name) {
    query += ` AND e.name ILIKE $${paramIndex}`;
    params.push(`%${name}%`);
    paramIndex++;
  }

  if (department) {
    query += ` AND d.name ILIKE $${paramIndex}`;
    params.push(`%${department}%`);
    paramIndex++;
  }

  if (start_date && end_date) {
    query += ` AND e.joining_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
    params.push(start_date, end_date);
    paramIndex += 2;
  }

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Search query failed" });
  }
});

router.get("/employees", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM employees ORDER BY id ASC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/employees", async (req, res) => {
  const { name, department_id, manager_id, joining_date } = req.body;
  if (!name || !department_id || !joining_date) {
    return res
      .status(400)
      .json({ error: "Name, department_id, and joining_date are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO employees (name, department_id, manager_id, joining_date) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, department_id, manager_id || null, joining_date],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res
      .status(500)
      .json({
        error:
          "Failed to create employee. Check if department_id or manager_id exists.",
      });
  }
});

module.exports = router;
