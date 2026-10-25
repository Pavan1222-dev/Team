
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function seed() {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Create departments if they don't already exist
        await client.query(`
            INSERT INTO departments (department_name, description)
            VALUES
                ('IT', 'Information Technology'),
                ('HR', 'Human Resources'),
                ('Finance', 'Finance and Accounting'),
                ('Marketing', 'Marketing and Sales'),
                ('Operations', 'Business Operations')
            ON CONFLICT (department_name) DO NOTHING;
        `);

        const departments = await client.query(`
            SELECT department_id, department_name
            FROM departments
        `);

        const dept = Object.fromEntries(
            departments.rows.map(row => [
                row.department_name,
                row.department_id
            ])
        );

        // Create 50 employees, with one top-level manager
        // and all other employees reporting to that manager.
        const employeeNames = Array.from(
            { length: 50 },
            (_, i) => ({
                code: `EMP${String(i + 1).padStart(3, "0")}`,
                first: `Employee${i + 1}`,
                last: "Demo",
                email: `employee${i + 1}@example.com`,
                department: [
                    "IT", "HR", "Finance", "Marketing", "Operations"
                ][i % 5],
                joiningDate: `${2020 + (i % 6)}-${String((i % 12) + 1).padStart(2, "0")}-01`
            })
        );

        // Insert the top-level manager first.
        const managerResult = await client.query(
            `INSERT INTO employees
                (employee_code, first_name, last_name, email,
                 department_id, manager_id, job_title, joining_date)
             VALUES ($1, $2, $3, $4, $5, NULL, $6, $7)
             ON CONFLICT (employee_code) DO UPDATE
             SET employee_code = EXCLUDED.employee_code
             RETURNING employee_id`,
            [
                employeeNames[0].code,
                employeeNames[0].first,
                employeeNames[0].last,
                employeeNames[0].email,
                dept[employeeNames[0].department],
                "General Manager",
                employeeNames[0].joiningDate
            ]
        );

        const managerId = managerResult.rows[0].employee_id;

        // Insert remaining employees under the manager.
        for (const emp of employeeNames.slice(1)) {
            await client.query(
                `INSERT INTO employees
                    (employee_code, first_name, last_name, email,
                     department_id, manager_id, job_title, joining_date)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (employee_code) DO NOTHING`,
                [
                    emp.code,
                    emp.first,
                    emp.last,
                    emp.email,
                    dept[emp.department],
                    managerId,
                    "Employee",
                    emp.joiningDate
                ]
            );
        }

        await client.query("COMMIT");
        console.log("Seed completed successfully.");
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Seed failed:", error.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

seed().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
