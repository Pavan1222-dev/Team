import express from 'express';
import { pool } from './db.js';

export const app = express();
app.use(express.json());

// Route handlers consistently return JSON errors; this wrapper forwards failures to the final handler.
const route = (handler) => async (req, res, next) => {
  try { await handler(req, res, next); } catch (error) { next(error); }
};
const badRequest = (message) => Object.assign(new Error(message), { status: 400 });
const notFound = (message) => Object.assign(new Error(message), { status: 404 });
const conflict = (message) => Object.assign(new Error(message), { status: 409 });
const validId = (value) => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value);
const requireId = (id, label) => { if (!validId(id)) throw badRequest(`${label} must be a UUID.`); };
const requireFields = (body, fields) => {
  for (const field of fields) if (body[field] === undefined || body[field] === '') throw badRequest(`${field} is required.`);
};
const positiveInteger = (value, label) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) throw badRequest(`${label} must be a non-negative integer.`);
  return number;
};

app.get('/api/v1/health', route(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ success: true, data: { status: 'ok' }, error: null });
}));

// Department CRUD. The database's RESTRICT foreign key becomes a readable 409 here.
app.get('/api/v1/departments', route(async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM departments ORDER BY name');
  res.json({ success: true, data: rows, error: null });
}));
app.post('/api/v1/departments', route(async (req, res) => {
  requireFields(req.body, ['name']);
  const { rows } = await pool.query('INSERT INTO departments (name, description) VALUES ($1, $2) RETURNING *', [req.body.name.trim(), req.body.description ?? null]);
  res.status(201).json({ success: true, data: rows[0], error: null });
}));
app.get('/api/v1/departments/:id', route(async (req, res) => {
  requireId(req.params.id, 'id');
  const { rows } = await pool.query('SELECT * FROM departments WHERE id = $1', [req.params.id]);
  if (!rows[0]) throw notFound('Department not found.');
  res.json({ success: true, data: rows[0], error: null });
}));
app.put('/api/v1/departments/:id', route(async (req, res) => {
  requireId(req.params.id, 'id'); requireFields(req.body, ['name']);
  const { rows } = await pool.query('UPDATE departments SET name = $1, description = $2, updated_at = now() WHERE id = $3 RETURNING *', [req.body.name.trim(), req.body.description ?? null, req.params.id]);
  if (!rows[0]) throw notFound('Department not found.');
  res.json({ success: true, data: rows[0], error: null });
}));
app.delete('/api/v1/departments/:id', route(async (req, res) => {
  requireId(req.params.id, 'id');
  try {
    const result = await pool.query('DELETE FROM departments WHERE id = $1', [req.params.id]);
    if (!result.rowCount) throw notFound('Department not found.');
    res.status(204).end();
  } catch (error) {
    if (error.code === '23503') throw conflict('Cannot delete this department while employees belong to it. Reassign or remove those employees first.');
    throw error;
  }
}));

// Employee search uses fixed SQL and nullable parameters so user input is never SQL syntax.
app.get('/api/v1/employees', route(async (req, res) => {
  const name = req.query.name ? `%${req.query.name}%` : null;
  const departmentId = req.query.departmentId ?? null;
  const from = req.query.joinedFrom ?? null;
  const to = req.query.joinedTo ?? null;
  if (departmentId) requireId(departmentId, 'departmentId');
  if (from && Number.isNaN(Date.parse(from))) throw badRequest('joinedFrom must be a valid date.');
  if (to && Number.isNaN(Date.parse(to))) throw badRequest('joinedTo must be a valid date.');
  const { rows } = await pool.query(`SELECT e.*, d.name AS department_name,
      m.first_name || ' ' || m.last_name AS manager_name
    FROM employees e JOIN departments d ON d.id = e.department_id
    LEFT JOIN employees m ON m.id = e.manager_id
    WHERE ($1::text IS NULL OR (e.first_name || ' ' || e.last_name) ILIKE $1)
      AND ($2::uuid IS NULL OR e.department_id = $2)
      AND ($3::date IS NULL OR e.joining_date >= $3)
      AND ($4::date IS NULL OR e.joining_date <= $4)
    ORDER BY e.last_name, e.first_name`, [name, departmentId, from, to]);
  res.json({ success: true, data: rows, error: null });
}));
app.post('/api/v1/employees', route(async (req, res) => {
  requireFields(req.body, ['firstName', 'lastName', 'email', 'departmentId', 'joiningDate']);
  requireId(req.body.departmentId, 'departmentId');
  if (req.body.managerId) requireId(req.body.managerId, 'managerId');
  const balance = req.body.leaveBalance === undefined ? 20 : positiveInteger(req.body.leaveBalance, 'leaveBalance');
  const { rows } = await pool.query(`INSERT INTO employees
    (first_name, last_name, email, department_id, manager_id, job_title, joining_date, leave_balance)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, [req.body.firstName.trim(), req.body.lastName.trim(), req.body.email.trim().toLowerCase(), req.body.departmentId, req.body.managerId ?? null, req.body.jobTitle ?? null, req.body.joiningDate, balance]);
  res.status(201).json({ success: true, data: rows[0], error: null });
}));
app.get('/api/v1/employees/:id', route(async (req, res) => {
  requireId(req.params.id, 'id');
  const { rows } = await pool.query(`SELECT e.*, d.name AS department_name,
      m.first_name || ' ' || m.last_name AS manager_name
    FROM employees e JOIN departments d ON d.id = e.department_id
    LEFT JOIN employees m ON m.id = e.manager_id WHERE e.id = $1`, [req.params.id]);
  if (!rows[0]) throw notFound('Employee not found.');
  res.json({ success: true, data: rows[0], error: null });
}));
app.put('/api/v1/employees/:id', route(async (req, res) => {
  requireId(req.params.id, 'id');
  requireFields(req.body, ['firstName', 'lastName', 'email', 'departmentId', 'joiningDate']);
  requireId(req.body.departmentId, 'departmentId');
  if (req.body.managerId) requireId(req.body.managerId, 'managerId');
  const balance = positiveInteger(req.body.leaveBalance, 'leaveBalance');
  const { rows } = await pool.query(`UPDATE employees SET first_name = $1, last_name = $2, email = $3,
    department_id = $4, manager_id = $5, job_title = $6, joining_date = $7,
    leave_balance = $8, updated_at = now() WHERE id = $9 RETURNING *`, [req.body.firstName.trim(), req.body.lastName.trim(), req.body.email.trim().toLowerCase(), req.body.departmentId, req.body.managerId ?? null, req.body.jobTitle ?? null, req.body.joiningDate, balance, req.params.id]);
  if (!rows[0]) throw notFound('Employee not found.');
  res.json({ success: true, data: rows[0], error: null });
}));
app.delete('/api/v1/employees/:id', route(async (req, res) => {
  requireId(req.params.id, 'id');
  const result = await pool.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
  if (!result.rowCount) throw notFound('Employee not found.');
  res.status(204).end();
}));

// A recursive CTE walks manager links from the requested employee toward the CEO/top-level manager.
app.get('/api/v1/reports/hierarchy/:employeeId', route(async (req, res) => {
  requireId(req.params.employeeId, 'employeeId');
  const { rows } = await pool.query(`WITH RECURSIVE chain AS (
    SELECT id, first_name, last_name, manager_id, 0 AS level, ARRAY[id] AS visited
    FROM employees WHERE id = $1
    UNION ALL
    SELECT m.id, m.first_name, m.last_name, m.manager_id, c.level + 1, c.visited || m.id
    FROM employees m JOIN chain c ON m.id = c.manager_id
    WHERE NOT m.id = ANY(c.visited)
  ) SELECT id, first_name, last_name, manager_id, level FROM chain ORDER BY level`, [req.params.employeeId]);
  if (!rows.length) throw notFound('Employee not found.');
  res.json({ success: true, data: rows, error: null });
}));
app.get('/api/v1/reports/headcount', route(async (_req, res) => {
  const { rows } = await pool.query(`SELECT d.id AS department_id, d.name AS department,
    count(e.id)::int AS headcount FROM departments d LEFT JOIN employees e ON e.department_id = d.id
    GROUP BY d.id, d.name ORDER BY d.name`);
  res.json({ success: true, data: rows, error: null });
}));
app.get('/api/v1/reports/on-leave-today', route(async (_req, res) => {
  const { rows } = await pool.query(`SELECT e.id, e.first_name, e.last_name, d.name AS department,
      l.start_date, l.end_date FROM leave_requests l JOIN employees e ON e.id = l.employee_id
      JOIN departments d ON d.id = e.department_id
      WHERE l.status = 'approved' AND CURRENT_DATE BETWEEN l.start_date AND l.end_date
      ORDER BY d.name, e.last_name, e.first_name`);
  res.json({ success: true, data: rows, error: null });
}));

app.get('/api/v1/leave-requests', route(async (req, res) => {
  const employeeId = req.query.employeeId ?? null;
  if (employeeId) requireId(employeeId, 'employeeId');
  const { rows } = await pool.query(`SELECT l.*, e.first_name, e.last_name
    FROM leave_requests l JOIN employees e ON e.id = l.employee_id
    WHERE ($1::uuid IS NULL OR l.employee_id = $1) ORDER BY l.created_at DESC`, [employeeId]);
  res.json({ success: true, data: rows, error: null });
}));
app.post('/api/v1/leave-requests', route(async (req, res) => {
  requireFields(req.body, ['employeeId', 'startDate', 'endDate']);
  requireId(req.body.employeeId, 'employeeId');
  if (Date.parse(req.body.endDate) < Date.parse(req.body.startDate)) throw badRequest('endDate must be on or after startDate.');
  const { rows } = await pool.query(`INSERT INTO leave_requests (employee_id, start_date, end_date, reason)
    VALUES ($1, $2, $3, $4) RETURNING *`, [req.body.employeeId, req.body.startDate, req.body.endDate, req.body.reason ?? null]);
  res.status(201).json({ success: true, data: rows[0], error: null });
}));

// Approval uses an employee-scoped advisory lock so simultaneous decisions cannot overdraw leave
// or approve overlapping date ranges. Only the assigned manager can decide a request.
app.post('/api/v1/leave-requests/:id/decision', route(async (req, res) => {
  requireId(req.params.id, 'id'); requireFields(req.body, ['managerId', 'decision']); requireId(req.body.managerId, 'managerId');
  if (!['approved', 'rejected'].includes(req.body.decision)) throw badRequest('decision must be approved or rejected.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const request = await client.query('SELECT * FROM leave_requests WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!request.rows[0]) throw notFound('Leave request not found.');
    const leave = request.rows[0];
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [leave.employee_id]);
    if (leave.status !== 'pending') throw conflict('This leave request has already been decided.');
    const employee = await client.query('SELECT * FROM employees WHERE id = $1 FOR UPDATE', [leave.employee_id]);
    if (employee.rows[0].manager_id !== req.body.managerId) throw Object.assign(new Error('Only the employee\'s assigned manager can decide this request.'), { status: 403 });
    let updated;
    if (req.body.decision === 'approved') {
      const overlap = await client.query(`SELECT 1 FROM leave_requests WHERE employee_id = $1 AND status = 'approved'
        AND daterange(start_date, end_date, '[]') && daterange($2::date, $3::date, '[]')`, [leave.employee_id, leave.start_date, leave.end_date]);
      if (overlap.rowCount) throw conflict('This request overlaps an existing approved leave.');
      const days = await client.query('SELECT ($2::date - $1::date + 1)::int AS days', [leave.start_date, leave.end_date]);
      if (employee.rows[0].leave_balance < days.rows[0].days) throw conflict('The employee does not have enough leave balance.');
      await client.query('UPDATE employees SET leave_balance = leave_balance - $1, updated_at = now() WHERE id = $2', [days.rows[0].days, leave.employee_id]);
      updated = await client.query(`UPDATE leave_requests SET status = 'approved', decided_by = $1,
        decided_at = now(), updated_at = now() WHERE id = $2 RETURNING *`, [req.body.managerId, req.params.id]);
    } else {
      updated = await client.query(`UPDATE leave_requests SET status = 'rejected', decided_by = $1,
        decided_at = now(), updated_at = now() WHERE id = $2 RETURNING *`, [req.body.managerId, req.params.id]);
    }
    await client.query('COMMIT');
    res.json({ success: true, data: updated.rows[0], error: null });
  } catch (error) {
    await client.query('ROLLBACK'); throw error;
  } finally { client.release(); }
}));

app.use((_req, _res, next) => next(notFound('Route not found.')));
app.use((error, _req, res, _next) => {
  // Translate common PostgreSQL constraint failures into useful API responses.
  if (error.code === '23505') error = conflict('A record with that unique value already exists.');
  if (error.code === '23503') error = conflict('This change conflicts with related records.');
  if (error.code === '23514' || error.code === '22P02' || error.code === '22007') error = badRequest('One or more values are invalid.');
  const status = error.status ?? 500;
  if (status === 500) console.error(error);
  res.status(status).json({ success: false, data: null, error: { message: error.message } });
});
