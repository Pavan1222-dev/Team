
const pool = require("../config/db");

// 1. Headcount per department
exports.getDepartmentHeadcount = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                d.department_id,
                d.department_name,
                COUNT(e.employee_id)::INTEGER AS headcount
            FROM departments d
            LEFT JOIN employees e
                ON e.department_id = d.department_id
            GROUP BY d.department_id, d.department_name
            ORDER BY d.department_name
        `);

        res.json(result.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: "Failed to fetch department headcount"
        });
    }
};

// 2. Employees on leave today
exports.getEmployeesOnLeaveToday = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                e.employee_id,
                e.employee_code,
                e.first_name,
                e.last_name,
                d.department_name,
                lr.start_date,
                lr.end_date
            FROM leave_requests lr
            JOIN employees e
                ON e.employee_id = lr.employee_id
            JOIN departments d
                ON d.department_id = e.department_id
            WHERE lr.status = 'approved'
              AND CURRENT_DATE BETWEEN lr.start_date AND lr.end_date
            ORDER BY e.first_name, e.last_name
        `);

        res.json(result.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: "Failed to fetch employees on leave today"
        });
    }
};

// 3. Reporting hierarchy: employee up to top manager
exports.getReportingHierarchy = async (req, res) => {
    const employeeId = Number(req.params.id);

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
        return res.status(400).json({
            message: "Invalid employee ID"
        });
    }

    try {
        const result = await pool.query(`
            WITH RECURSIVE hierarchy AS (
                SELECT
                    employee_id,
                    employee_code,
                    first_name,
                    last_name,
                    manager_id,
                    job_title,
                    0 AS level
                FROM employees
                WHERE employee_id = $1

                UNION ALL

                SELECT
                    m.employee_id,
                    m.employee_code,
                    m.first_name,
                    m.last_name,
                    m.manager_id,
                    m.job_title,
                    h.level + 1
                FROM employees m
                JOIN hierarchy h
                    ON h.manager_id = m.employee_id
                WHERE h.level < 100
            )
            SELECT *
            FROM hierarchy
            ORDER BY level
        `, [employeeId]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: "Employee not found"
            });
        }

        res.json({
            employee_id: employeeId,
            hierarchy: result.rows
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: "Failed to fetch reporting hierarchy"
        });
    }
};
