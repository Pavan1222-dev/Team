
const pool = require("../config/db");

// CREATE employee
exports.createEmployee = async (req, res) => {
    try {
        const {
            employee_code,
            first_name,
            last_name,
            email,
            department_id,
            manager_id,
            job_title,
            joining_date
        } = req.body;

        if (
            !employee_code ||
            !first_name ||
            !last_name ||
            !email ||
            !department_id ||
            !joining_date
        ) {
            return res.status(400).json({
                message: "Employee code, name, email, department and joining date are required"
            });
        }

        const result = await pool.query(
            `INSERT INTO employees
                (employee_code, first_name, last_name, email,
                 department_id, manager_id, job_title, joining_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                employee_code,
                first_name,
                last_name,
                email,
                department_id,
                manager_id || null,
                job_title || null,
                joining_date
            ]
        );

        return res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                message: "Employee code or email already exists"
            });
        }

        if (error.code === "23503") {
            return res.status(400).json({
                message: "Department or manager does not exist"
            });
        }

        console.error(error.message);
        return res.status(500).json({
            message: "Failed to create employee"
        });
    }
};

// GET all employees
exports.getEmployees = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT e.employee_id, e.employee_code,
                    e.first_name, e.last_name, e.email,
                    e.department_id, d.department_name,
                    e.manager_id, e.job_title, e.joining_date
             FROM employees e
             JOIN departments d
               ON d.department_id = e.department_id
             ORDER BY e.employee_id`
        );

        return res.json(result.rows);
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({
            message: "Failed to fetch employees"
        });
    }
};

// GET employee by ID
exports.getEmployeeById = async (req, res) => {
    try {
        const employeeId = Number(req.params.id);

        if (!Number.isInteger(employeeId) || employeeId <= 0) {
            return res.status(400).json({
                message: "Invalid employee ID"
            });
        }

        const result = await pool.query(
            `SELECT e.*, d.department_name,
                    m.first_name AS manager_first_name,
                    m.last_name AS manager_last_name
             FROM employees e
             JOIN departments d
               ON d.department_id = e.department_id
             LEFT JOIN employees m
               ON m.employee_id = e.manager_id
             WHERE e.employee_id = $1`,
            [employeeId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: "Employee not found"
            });
        }

        return res.json(result.rows[0]);
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({
            message: "Failed to fetch employee"
        });
    }
};

// UPDATE employee
exports.updateEmployee = async (req, res) => {
    try {
        const employeeId = Number(req.params.id);

        if (!Number.isInteger(employeeId) || employeeId <= 0) {
            return res.status(400).json({
                message: "Invalid employee ID"
            });
        }

        const allowedFields = [
            "first_name",
            "last_name",
            "email",
            "department_id",
            "manager_id",
            "job_title",
            "joining_date"
        ];

        const updates = [];
        const values = [];

        for (const field of allowedFields) {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                values.push(req.body[field]);
                updates.push(`${field} = $${values.length}`);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({
                message: "Provide at least one supported field to update"
            });
        }

        values.push(employeeId);

        const result = await pool.query(
            `UPDATE employees
             SET ${updates.join(", ")}
             WHERE employee_id = $${values.length}
             RETURNING *`,
            values
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: "Employee not found"
            });
        }

        return res.json(result.rows[0]);
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                message: "Email already exists"
            });
        }

        if (error.code === "23503") {
            return res.status(400).json({
                message: "Department or manager does not exist"
            });
        }

        console.error(error.message);
        return res.status(500).json({
            message: "Failed to update employee"
        });
    }
};

// DELETE employee
exports.deleteEmployee = async (req, res) => {
    try {
        const employeeId = Number(req.params.id);

        if (!Number.isInteger(employeeId) || employeeId <= 0) {
            return res.status(400).json({
                message: "Invalid employee ID"
            });
        }

        const result = await pool.query(
            `DELETE FROM employees
             WHERE employee_id = $1
             RETURNING employee_id`,
            [employeeId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: "Employee not found"
            });
        }

        return res.json({
            message: "Employee deleted successfully"
        });
    } catch (error) {
        if (error.code === "23503") {
            return res.status(409).json({
                message: "Cannot delete employee because they are referenced by other records"
            });
        }

        console.error(error.message);
        return res.status(500).json({
            message: "Failed to delete employee"
        });
    }
};


exports.searchEmployees = async (req, res) => {
    try {
        const {
            name,
            department_id,
            start_date,
            end_date
        } = req.query;

        const conditions = [];
        const values = [];

        if (name) {
            values.push(`%${name}%`);
            conditions.push(
                `(first_name ILIKE $${values.length}
                  OR last_name ILIKE $${values.length}
                  OR first_name || ' ' || last_name ILIKE $${values.length})`
            );
        }

        if (department_id !== undefined) {
            const departmentId = Number(department_id);

            if (!Number.isInteger(departmentId) || departmentId <= 0) {
                return res.status(400).json({
                    message: "department_id must be a positive integer"
                });
            }

            values.push(departmentId);
            conditions.push(`department_id = $${values.length}`);
        }

        if (start_date && !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
            return res.status(400).json({
                message: "start_date must use YYYY-MM-DD format"
            });
        }

        if (end_date && !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
            return res.status(400).json({
                message: "end_date must use YYYY-MM-DD format"
            });
        }

        if (start_date && end_date && start_date > end_date) {
            return res.status(400).json({
                message: "start_date cannot be after end_date"
            });
        }

        if (start_date) {
            values.push(start_date);
            conditions.push(`joining_date >= $${values.length}`);
        }

        if (end_date) {
            values.push(end_date);
            conditions.push(`joining_date <= $${values.length}`);
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

        const result = await pool.query(
            `SELECT employee_id, employee_code, first_name,
                    last_name, email, department_id,
                    manager_id, job_title, joining_date
             FROM employees
             ${whereClause}
             ORDER BY employee_id`,
            values
        );

        return res.json({
            count: result.rowCount,
            employees: result.rows
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({
            message: "Failed to search employees"
        });
    }
};
