const { pool } = require('./db');

async function runMigration() {
  try {
    console.log('Creating database tables...');

    await pool.query(`      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
      );      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        department_id INTEGER REFERENCES departments(id) ON DELETE RESTRICT,
        manager_id INTEGER REFERENCES employees(id),
        joining_date DATE NOT NULL,
        leave_balance INTEGER DEFAULT 20
      );      CREATE TABLE IF NOT EXISTS leave_requests (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
      );      CREATE INDEX IF NOT EXISTS idx_employee_name ON employees(name);
      CREATE INDEX IF NOT EXISTS idx_employee_dept ON employees(department_id);
      CREATE INDEX IF NOT EXISTS idx_employee_joining ON employees(joining_date);
    `);

    console.log('Tables and indexes created successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    pool.end(); 
  }
}

runMigration();