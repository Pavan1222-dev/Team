
const pool = require("../config/db");

// CREATE department
exports.createDepartment = async (req, res) => {
    try {
        const { department_name, description } = req.body;

        if (!department_name || !department_name.trim()) {
            return res.status(400).json({
                message: "Department name is required"
            });
        }

        const result = await pool.query(
            `INSERT INTO departments (department_name, description)
             VALUES ($1, $2)
             RETURNING *`,
            [department_name.trim(), description || null]
        );

        return res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                message: "Department already exists"
            });
        }

        console.error(error.message);
        return res.status(500).json({
            message: "Failed to create department"
        });
    }
};

// GET all departments
exports.getDepartments = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT d.department_id, d.department_name, d.description,
                    COUNT(e.employee_id)::INTEGER AS employee_count
             FROM departments d
             LEFT JOIN employees e
               ON e.department_id = d.department_id
             GROUP BY d.department_id
             ORDER BY d.department_id`
        );

        return res.json(result.rows);
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({
            message: "Failed to fetch departments"
        });
    }
};

// GET one department
exports.getDepartmentById = async (req, res) => {
    try {
        const departmentId = Number(req.params.id);

        if (!Number.isInteger(departmentId) || departmentId <= 0) {
            return res.status(400).json({
                message: "Invalid department ID"
            });
        }

        const result = await pool.query(
            `SELECT * FROM departments WHERE department_id = $1`,
            [departmentId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: "Department not found"
            });
        }

        return res.json(result.rows[0]);
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({
            message: "Failed to fetch department"
        });
    }
};

// UPDATE department
exports.updateDepartment = async (req, res) => {
    try {
        const departmentId = Number(req.params.id);
        const { department_name, description } = req.body;

        if (!Number.isInteger(departmentId) || departmentId <= 0) {
            return res.status(400).json({
                message: "Invalid department ID"
            });
        }

        if (
            department_name !== undefined &&
            (typeof department_name !== "string" || !department_name.trim())
        ) {
            return res.status(400).json({
                message: "Department name must be a non-empty string"
            });
        }

        const result = await pool.query(
            `UPDATE departments
             SET department_name = COALESCE($1, department_name),
                 description = COALESCE($2, description)
             WHERE department_id = $3
             RETURNING *`,
            [
                department_name === undefined ? null : department_name.trim(),
                description === undefined ? null : description,
                departmentId
            ]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: "Department not found"
            });
        }

        return res.json(result.rows[0]);
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                message: "Department name already exists"
            });
        }

        console.error(error.message);
        return res.status(500).json({
            message: "Failed to update department"
        });
    }
};

// DELETE department
exports.deleteDepartment = async (req, res) => {
    try {
        const departmentId = Number(req.params.id);

        if (!Number.isInteger(departmentId) || departmentId <= 0) {
            return res.status(400).json({
                message: "Invalid department ID"
            });
        }

        const result = await pool.query(
            `DELETE FROM departments d
             WHERE d.department_id = $1
               AND NOT EXISTS (
                   SELECT 1 FROM employees e
                   WHERE e.department_id = d.department_id
               )
             RETURNING d.department_id`,
            [departmentId]
        );

        if (result.rowCount === 0) {
            const exists = await pool.query(
                `SELECT department_id FROM departments WHERE department_id = $1`,
                [departmentId]
            );

            if (exists.rowCount === 0) {
                return res.status(404).json({
                    message: "Department not found"
                });
            }

            return res.status(409).json({
                message: "Cannot delete department because employees are assigned to it"
            });
        }

        return res.json({
            message: "Department deleted successfully"
        });
    } catch (error) {
        if (error.code === "23503") {
            return res.status(409).json({
                message: "Cannot delete department because it is referenced by existing records"
            });
        }

        console.error(error.message);
        return res.status(500).json({
            message: "Failed to delete department"
        });
    }
};
