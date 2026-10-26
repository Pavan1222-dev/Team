const express = require("express");
const { pool } = require("../db");

const router = express.Router();

router.post("/leaves", async (req, res) => {
  const { employee_id, start_date, end_date } = req.body;
  if (!employee_id || !start_date || !end_date) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const overlapCheck = await pool.query(
      `SELECT id FROM leave_requests 
       WHERE employee_id = $1 
       AND status = 'APPROVED'
       AND (start_date <= $3 AND end_date >= $2)`,
      [employee_id, start_date, end_date],
    );

    if (overlapCheck.rowCount > 0) {
      return res.status(400).json({
        error: "Leave request overlaps with an existing approved leave",
      });
    }

    const result = await pool.query(
      `INSERT INTO leave_requests (employee_id, start_date, end_date, status) 
       VALUES ($1, $2, $3, 'PENDING') RETURNING *`,
      [employee_id, start_date, end_date],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/leaves/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["APPROVED", "REJECTED"].includes(status)) {
    return res
      .status(400)
      .json({ error: "Status must be APPROVED or REJECTED" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const leaveReq = await client.query(
      "SELECT * FROM leave_requests WHERE id = $1",
      [id],
    );
    if (leaveReq.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Leave request not found" });
    }

    const leave = leaveReq.rows[0];
    if (leave.status !== "PENDING") {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ error: "Leave request is already processed" });
    }

    const updatedLeave = await client.query(
      "UPDATE leave_requests SET status = $1 WHERE id = $2 RETURNING *",
      [status, id],
    );

    if (status === "APPROVED") {
      const daysQuery = await client.query(
        `SELECT ($1::date - $2::date) + 1 AS days`,
        [leave.end_date, leave.start_date],
      );
      const daysToDeduct = daysQuery.rows[0].days;

      await client.query(
        "UPDATE employees SET leave_balance = leave_balance - $1 WHERE id = $2",
        [daysToDeduct, leave.employee_id],
      );
    }

    await client.query("COMMIT");
    res.json(updatedLeave.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

module.exports = router;
