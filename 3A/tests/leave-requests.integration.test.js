import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import pg from 'pg';
import { createApp } from '../src/app.js';

const { Pool } = pg;
const testDatabaseName = process.env.TEST_DB_NAME;
const developmentDatabaseName = process.env.DB_NAME;
const skipReason = !testDatabaseName
  ? 'Set TEST_DB_NAME to a dedicated isolated PostgreSQL test database.'
  : testDatabaseName === developmentDatabaseName
    ? 'TEST_DB_NAME must differ from DB_NAME; refusing to use the development database.'
    : false;
const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function poolOptions(schema) {
  return {
    host: process.env.TEST_DB_HOST || process.env.DB_HOST,
    port: Number(process.env.TEST_DB_PORT || process.env.DB_PORT),
    database: testDatabaseName,
    user: process.env.TEST_DB_USER || process.env.DB_USER,
    password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD,
    ...(schema ? { options: `-c search_path=${schema},public` } : {}),
  };
}

async function request(baseUrl, method, route, body) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

test('leave request API validates requests and applies manager review rules in an isolated schema', { skip: skipReason }, async (context) => {
  assert.notEqual(testDatabaseName, developmentDatabaseName);
  const schema = `leave_api_test_${randomUUID().replaceAll('-', '')}`;
  const adminPool = new Pool(poolOptions());
  let schemaCreated = false;
  let database;
  let server;
  context.after(async () => {
    if (server) await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    if (database) await database.end();
    if (schemaCreated) await adminPool.query(`DROP SCHEMA "${schema}" CASCADE`);
    await adminPool.end();
  });

  await adminPool.query(`CREATE SCHEMA "${schema}"`);
  schemaCreated = true;
  database = new Pool(poolOptions(schema));
  for (const filename of [
    '001_create_departments.sql', '002_create_employees.sql', '003_create_leave_requests.sql',
  ]) {
    await database.query(await fs.readFile(path.join(projectDirectory, 'migrations', filename), 'utf8'));
  }

  server = createApp({ database }).listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const department = (await request(baseUrl, 'POST', '/api/departments', { name: 'Leave API' })).body.data;
  const manager = (await request(baseUrl, 'POST', '/api/employees', {
    firstName: 'Morgan', lastName: 'Manager', email: 'morgan@example.test', departmentId: department.id,
  })).body.data;
  const employee = (await request(baseUrl, 'POST', '/api/employees', {
    firstName: 'Taylor', lastName: 'Employee', email: 'taylor@example.test',
    departmentId: department.id, managerId: manager.id,
  })).body.data;
  const outsider = (await request(baseUrl, 'POST', '/api/employees', {
    firstName: 'Alex', lastName: 'Outsider', email: 'alex@example.test', departmentId: department.id,
  })).body.data;

  assert.equal((await request(baseUrl, 'GET', '/api/leave-requests', undefined)).body.data.pagination.totalItems, 0);
  assert.equal((await request(baseUrl, 'POST', '/api/leave-requests', {
    employeeId: employee.id, startDate: '2026-02-30', endDate: '2026-03-01', reason: 'Invalid date',
  })).status, 400);
  assert.equal((await request(baseUrl, 'POST', '/api/leave-requests', {
    employeeId: employee.id, startDate: '2026-06-02', endDate: '2026-06-01', reason: 'Reversed dates',
  })).status, 400);

  const create = (startDate, endDate, reason = 'Annual leave') => request(baseUrl, 'POST', '/api/leave-requests', {
    employeeId: employee.id, startDate, endDate, reason,
  });
  const pending = await create('2026-06-10', '2026-06-12');
  assert.equal(pending.status, 201);
  assert.equal(pending.body.data.status, 'PENDING');
  assert.equal(pending.body.data.durationDays, 3);
  assert.equal(pending.body.data.reviewerId, null);
  assert.equal((await request(baseUrl, 'GET', `/api/leave-requests/${pending.body.data.id}`, undefined)).body.data.id, pending.body.data.id);
  assert.equal((await request(baseUrl, 'GET', '/api/leave-requests/not-an-id', undefined)).status, 400);
  assert.equal((await request(baseUrl, 'GET', '/api/leave-requests/99999999', undefined)).status, 404);
  const filtered = await request(baseUrl, 'GET', `/api/leave-requests?employeeId=${employee.id}&status=pending&page=1&limit=1`, undefined);
  assert.equal(filtered.status, 200);
  assert.equal(filtered.body.data.items.length, 1);
  assert.equal(filtered.body.data.pagination.totalItems, 1);
  assert.equal((await request(baseUrl, 'GET', '/api/leave-requests?status=NOPE', undefined)).status, 400);

  assert.equal((await request(baseUrl, 'PATCH', `/api/leave-requests/${pending.body.data.id}/approve`, { reviewerId: outsider.id })).status, 403);
  assert.equal((await request(baseUrl, 'PATCH', `/api/leave-requests/${pending.body.data.id}/approve`, { reviewerId: '99999999' })).status, 404);
  const approved = await request(baseUrl, 'PATCH', `/api/leave-requests/${pending.body.data.id}/approve`, { reviewerId: manager.id });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.data.status, 'APPROVED');
  assert.equal(Number(approved.body.data.remainingLeaveBalanceDays), 17);
  assert.equal((await request(baseUrl, 'PATCH', `/api/leave-requests/${pending.body.data.id}/approve`, { reviewerId: manager.id })).status, 409);

  const overlap = await create('2026-06-12', '2026-06-14', 'Inclusive boundary overlap');
  assert.equal((await request(baseUrl, 'PATCH', `/api/leave-requests/${overlap.body.data.id}/approve`, { reviewerId: manager.id })).status, 409);
  const rejected = await create('2026-07-01', '2026-07-02', 'No balance deduction on rejection');
  assert.equal((await request(baseUrl, 'PATCH', `/api/leave-requests/${rejected.body.data.id}/reject`, { reviewerId: manager.id })).body.data.status, 'REJECTED');
  assert.equal((await request(baseUrl, 'PATCH', `/api/leave-requests/${rejected.body.data.id}/reject`, { reviewerId: manager.id })).status, 409);

  const lowBalance = await request(baseUrl, 'POST', '/api/employees', {
    firstName: 'Low', lastName: 'Balance', email: 'low@example.test', departmentId: department.id, managerId: manager.id,
  });
  await database.query('UPDATE employees SET leave_balance_days = 1 WHERE id = $1', [lowBalance.body.data.id]);
  const tooLong = await request(baseUrl, 'POST', '/api/leave-requests', {
    employeeId: lowBalance.body.data.id, startDate: '2026-08-01', endDate: '2026-08-02', reason: 'Insufficient balance',
  });
  const insufficient = await request(baseUrl, 'PATCH', `/api/leave-requests/${tooLong.body.data.id}/approve`, { reviewerId: manager.id });
  assert.equal(insufficient.status, 409);
  assert.equal((await database.query('SELECT leave_balance_days FROM employees WHERE id = $1', [lowBalance.body.data.id])).rows[0].leave_balance_days, '1.00');

  const rollbackRequest = await create('2026-09-01', '2026-09-02', 'Rollback test');
  await database.query(`
    CREATE FUNCTION reject_approval_update() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.status = 'APPROVED' THEN RAISE EXCEPTION 'forced test failure'; END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER reject_approval_update BEFORE UPDATE ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION reject_approval_update();
  `);
  const rollbackResponse = await request(baseUrl, 'PATCH', `/api/leave-requests/${rollbackRequest.body.data.id}/approve`, { reviewerId: manager.id });
  assert.equal(rollbackResponse.status, 500);
  assert.doesNotMatch(JSON.stringify(rollbackResponse.body), /forced test failure/);
  const state = await database.query(
    `SELECT e.leave_balance_days, r.status FROM employees e JOIN leave_requests r ON r.employee_id = e.id WHERE e.id = $1 AND r.id = $2`,
    [employee.id, rollbackRequest.body.data.id],
  );
  assert.equal(state.rows[0].leave_balance_days, '17.00');
  assert.equal(state.rows[0].status, 'PENDING');
  await database.query('DROP TRIGGER reject_approval_update ON leave_requests');
  await database.query('DROP FUNCTION reject_approval_update()');
});
