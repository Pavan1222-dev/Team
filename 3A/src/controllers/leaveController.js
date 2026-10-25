
const pool = require("../config/db");

// Apply for leave
exports.applyLeave = async (req, res) => {
    const { employee_id, start_date, end_date, reason } = req.body;

    if (
        !Number.isInteger(employee_id) ||
        employee_id <= 0 ||
        !start_date ||
        !end_date ||
        typeof reason !== "string" ||
        !reason.trim()
    ) {
        return res.status(400).json({
            message: "Valid employee_id, start_date, end_date and reason are required"
        });
    }

    // Validate date format and calendar validity.
    const isValidDate = (value) => {
        if (typeof value !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return false;
        }

        const date = new Date(`${value}T00:00:00Z`);
        return !Number.isNaN(date.getTime()) &&
            date.toISOString().slice(0, 10) === value;
    };

    if (!isValidDate(start_date) || !isValidDate(end_date) ||
        start_date > end_date) {
        return res.status(400).json({
            message: "Invalid dates. Use YYYY-MM-DD and ensure end_date is not before start_date"
        });
    }

    try {
        const result = await pool.query(
            `INSERT INTO leave_requests
                (employee_id, start_date, end_date, reason)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [employee_id, start_date, end_date, reason.trim()]
        );

        return res.status(201).json({
            message: "Leave request submitted successfully",
            leave: result.rows[0]
        });
    } catch (error) {
        if (error.code === "23503") {
            return res.status(404).json({
                message: "Employee not found"
            });
        }

        console.error(error.message);
        return res.status(500).json({
            message: "Failed to submit leave request"
        });
    }
};

// List leave requests
exports.getLeaveRequests = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT lr.*, e.first_name, e.last_name, e.employee_code
             FROM leave_requests lr
             JOIN employees e ON e.employee_id = lr.employee_id
             ORDER BY lr.created_at DESC, lr.leave_request_id DESC`
        );

        return res.json(result.rows);
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({
            message: "Failed to fetch leave requests"
        });
    }
};

// Approve or reject leave
exports.reviewLeave = async (req, res) => {
    const leaveId = Number(req.params.id);
    const { manager_id, decision, review_comment } = req.body;

    if (!Number.isInteger(leaveId) || leaveId <= 0) {
        return res.status(400).json({ message: "Invalid leave request ID" });
    }

    if (!Number.isInteger(manager_id) || manager_id <= 0) {
        return res.status(400).json({ message: "Valid manager_id is required" });
    }

    if (!["approved", "rejected"].includes(decision)) {
        return res.status(400).json({
            message: "decision must be approved or rejected"
        });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Lock the leave request to prevent duplicate reviews.
        const leaveResult = await client.query(
            `SELECT * FROM leave_requests
             WHERE leave_request_id = $1
             FOR UPDATE`,
            [leaveId]
        );

        if (leaveResult.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "Leave request not found" });
        }

        const leave = leaveResult.rows[0];

        if (leave.status !== "pending") {
            await client.query("ROLLBACK");
            return res.status(409).json({
                message: "This leave request has already been reviewed"
            });
        }

        if (leave.employee_id === manager_id) {
            await client.query("ROLLBACK");
            return res.status(403).json({
                message: "Employees cannot approve or reject their own leave"
            });
        }

        // Verify that the reviewer is the employee's assigned manager.
        const employeeResult = await client.query(
            `SELECT manager_id FROM employees
             WHERE employee_id = $1`,
            [leave.employee_id]
        );

        if (
            employeeResult.rowCount === 0 ||
            employeeResult.rows[0].manager_id !== manager_id
        ) {
            await client.query("ROLLBACK");
            return res.status(403).json({
                message: "Only the assigned manager can review this request"
            });
        }

        if (decision === "approved") {
            // Lock employee balance while processing the approval.
            const employeeResult = await client.query(
                `SELECT leave_balance
                 FROM employees
                 WHERE employee_id = $1
                 FOR UPDATE`,
                [leave.employee_id]
            );

            // Count inclusive calendar days.
            const daysResult = await client.query(
                `SELECT ($2::date - $1::date + 1)::INTEGER AS days`,
                [leave.start_date, leave.end_date]
            );

            const days = daysResult.rows[0].days;
            const balance = Number(employeeResult.rows[0].leave_balance);

            if (balance < days) {
                await client.query("ROLLBACK");
                return res.status(409).json({
                    message: "Insufficient leave balance",
                    available_balance: balance,
                    requested_days: days
                });
            }

            // Reject any overlap with another approved leave.
            const overlapResult = await client.query(
                `SELECT leave_request_id
                 FROM leave_requests
                 WHERE employee_id = $1
                   AND status = 'approved'
                   AND start_date <= $3::date
                   AND end_date >= $2::date
                 LIMIT 1`,
                [leave.employee_id, leave.start_date, leave.end_date]
            );

            if (overlapResult.rowCount > 0) {
                await client.query("ROLLBACK");
                return res.status(409).json({
                    message: "Leave overlaps an existing approved leave"
                });
            }

            await client.query(
                `UPDATE employees
                 SET leave_balance = leave_balance - $1
                 WHERE employee_id = $2`,
                [days, leave.employee_id]
            );
        }

        const updated = await client.query(
            `UPDATE leave_requests
             SET status = $1,
                 reviewed_by = $2,
                 reviewed_at = CURRENT_TIMESTAMP,
                 review_comment = $3
             WHERE leave_request_id = $4
             RETURNING *`,
            [
                decision,
                manager_id,
                review_comment || null,
                leaveId
            ]
        );

        await client.query("COMMIT");

        return res.json({
            message: `Leave request ${decision} successfully`,
            leave: updated.rows[0]
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error(error.message);

        return res.status(500).json({
            message: "Failed to review leave request"
        });
    } finally {
        client.release();
    }
};
