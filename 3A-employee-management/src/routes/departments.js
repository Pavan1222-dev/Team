const express = require("express");
const { pool } = require("../db");

const router = express.Router();

router.get("/departments", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM departments ORDER BY id ASC",
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/departments", async (req, res) => {
  const { name } = req.body;
  if (!name)
    return res.status(400).json({ error: "Department name is required" });

  try {
    const result = await pool.query(
      "INSERT INTO departments (name) VALUES ($1) RETURNING *",
      [name],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "Department name already exists" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/departments/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM departments WHERE id = $1 RETURNING *",
      [id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Department not found" });
    }

    res.json({ message: "Department deleted successfully" });
  } catch (error) {
    if (error.code === "23503") {
      return res.status(400).json({
        error:
          "Cannot delete department. It currently has active employees assigned to it.",
      });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
