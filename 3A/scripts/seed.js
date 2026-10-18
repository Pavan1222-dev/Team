import { pathToFileURL } from 'node:url';
import { departments, employees } from '../seeds/seed-data.js';

export async function seedDatabase(database) {
  const client = await database.connect();
  let started = false;
  let insertedDepartments = 0;
  let insertedEmployees = 0;

  try {
    await client.query('BEGIN');
    started = true;

    const departmentIds = new Map();
    for (const name of departments) {
      const insert = await client.query(
        `INSERT INTO departments (name, description)
         VALUES ($1, $2)
         ON CONFLICT (name) DO NOTHING
         RETURNING id`,
        [name, `Seed department for fictional sample employees: ${name}.`],
      );
      insertedDepartments += insert.rowCount;
      const existing = insert.rows[0] ?? (await client.query(
        'SELECT id FROM departments WHERE name = $1', [name],
      )).rows[0];
      departmentIds.set(name, existing.id);
    }

    const employeeIds = new Map();
    for (const employee of employees) {
      const managerId = employee.managerEmail === null
        ? null
        : employeeIds.get(employee.managerEmail)
          ?? (await client.query('SELECT id FROM employees WHERE email = $1', [employee.managerEmail])).rows[0]?.id;
      if (employee.managerEmail !== null && managerId === undefined) {
        throw new Error(`Seed manager ${employee.managerEmail} was not found.`);
      }
      const insert = await client.query(
        `INSERT INTO employees
           (first_name, last_name, email, department_id, manager_id, joining_date)
         VALUES ($1, $2, $3, $4, $5, $6::date)
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [employee.firstName, employee.lastName, employee.email,
          departmentIds.get(employee.department), managerId, employee.joiningDate],
      );
      insertedEmployees += insert.rowCount;
      const existing = insert.rows[0] ?? (await client.query(
        'SELECT id FROM employees WHERE email = $1', [employee.email],
      )).rows[0];
      employeeIds.set(employee.email, existing.id);
    }

    await client.query('COMMIT');
    return { departmentCount: departments.length, employeeCount: employees.length, insertedDepartments, insertedEmployees };
  } catch (error) {
    if (started) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function runSeed() {
  const { pool } = await import('../src/config/db.js');
  try {
    const result = await seedDatabase(pool);
    console.log(`Seed complete: ${result.insertedEmployees} of ${result.employeeCount} fictional employees added; existing records were left unchanged.`);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSeed().catch((error) => {
    console.error('Seed failed. No existing records were overwritten or deleted.');
    process.exitCode = 1;
  });
}
