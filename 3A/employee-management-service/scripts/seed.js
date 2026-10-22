import 'dotenv/config';
import { pool } from '../src/db.js';

const departments = [
  ['Engineering', 'Product engineering and platform operations'],
  ['People', 'People operations and hiring'],
  ['Finance', 'Accounting and financial planning'],
  ['Sales', 'Customer acquisition and partnerships'],
  ['Support', 'Customer support and success'],
  ['Marketing', 'Brand and product marketing'],
];

const client = await pool.connect();
try {
  await client.query('BEGIN');
  const deptIds = [];
  for (const [name, description] of departments) {
    const result = await client.query(`INSERT INTO departments (name, description) VALUES ($1, $2)
      ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING id`, [name, description]);
    deptIds.push(result.rows[0].id);
  }

  // The seed is repeatable: it clears only the sample company data before rebuilding it.
  await client.query('DELETE FROM employees');
  const managerIds = [];
  for (let i = 0; i < departments.length; i += 1) {
    const result = await client.query(`INSERT INTO employees
      (first_name, last_name, email, department_id, job_title, joining_date, leave_balance)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [['Avery', 'Jordan', 'Morgan', 'Riley', 'Casey', 'Taylor'][i],
      ['Chen', 'Patel', 'Reed', 'Kim', 'Singh', 'Diaz'][i],
      `manager${i + 1}@example.com`, deptIds[i], 'Department Manager', '2020-01-06', 20]);
    managerIds.push(result.rows[0].id);
  }

  // Add 48 staff members (54 total) under the six department managers.
  const firstNames = ['Sam', 'Alex', 'Jamie', 'Robin', 'Drew', 'Cameron', 'Skyler', 'Lee', 'Ari', 'Jesse', 'Reese', 'Kai'];
  const lastNames = ['Adams', 'Brooks', 'Carter', 'Evans', 'Foster', 'Gray', 'Hayes', 'Iverson', 'Jones', 'Khan', 'Lopez', 'Miller'];
  for (let i = 0; i < 48; i += 1) {
    const departmentIndex = i % departments.length;
    await client.query(`INSERT INTO employees
      (first_name, last_name, email, department_id, manager_id, job_title, joining_date, leave_balance)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [firstNames[i % firstNames.length], lastNames[(i * 5) % lastNames.length], `employee${String(i + 1).padStart(3, '0')}@example.com`,
      deptIds[departmentIndex], managerIds[departmentIndex], ['Associate', 'Specialist', 'Analyst', 'Coordinator'][i % 4],
      `202${1 + (i % 5)}-${String((i % 12) + 1).padStart(2, '0')}-15`, 20]);
  }
  await client.query('COMMIT');
  console.log('Seeded 6 departments and 54 employees. Sample password/authentication is outside this API.');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally { client.release(); await pool.end(); }
