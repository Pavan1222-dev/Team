import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import pg from 'pg';
import { createApp } from '../src/app.js';
import { seedDatabase } from '../scripts/seed.js';

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

test('report APIs cover headcount, current approved leave, manager hierarchy, and idempotent seeds', { skip: skipReason }, async (context) => {
  assert.notEqual(testDatabaseName, developmentDatabaseName);
  const schema = `reports_test_${randomUUID().replaceAll('-', '')}`;
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
    '004_add_approved_leave_report_index.sql',
  ]) {
    await database.query(await fs.readFile(path.join(projectDirectory, 'migrations', filename), 'utf8'));
  }

  server = createApp({ database }).listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const today = (await database.query('SELECT CURRENT_DATE::text AS today')).rows[0].today;
  const emptyDepartment = await request(baseUrl, 'POST', '/api/departments', { name: 'Empty report department' });
  const department = await request(baseUrl, 'POST', '/api/departments', { name: 'Report department' });
  const departmentId = department.body.data.id;
  const root = (await request(baseUrl, 'POST', '/api/employees', {
    firstName: 'Robin', lastName: 'Root', email: 'root@reports.test', departmentId,
  })).body.data;
  const manager = (await request(baseUrl, 'POST', '/api/employees', {
    firstName: 'Jamie', lastName: 'Manager', email: 'manager@reports.test', departmentId, managerId: root.id,
  })).body.data;
  const employee = (await request(baseUrl, 'POST', '/api/employees', {
    firstName: 'Alex', lastName: 'Staff', email: 'staff@reports.test', departmentId, managerId: manager.id,
  })).body.data;

  const headcount = await request(baseUrl, 'GET', '/api/reports/department-headcount');
  assert.equal(headcount.status, 200);
  assert.equal(headcount.body.data.find((row) => row.id === emptyDepartment.body.data.id).employeeCount, 0);
  assert.equal(headcount.body.data.find((row) => row.id === departmentId).employeeCount, 3);

  const createLeave = (startDate, endDate, reason) => request(baseUrl, 'POST', '/api/leave-requests', {
    employeeId: employee.id, startDate, endDate, reason,
  });
  const approved = await createLeave(today, today, 'Approved today');
  assert.equal(approved.status, 201);
  assert.equal((await request(baseUrl, 'PATCH', `/api/leave-requests/${approved.body.data.id}/approve`, { reviewerId: manager.id })).status, 200);
  const pending = await createLeave(today, today, 'Pending today');
  const rejected = await createLeave(today, today, 'Rejected today');
  assert.equal((await request(baseUrl, 'PATCH', `/api/leave-requests/${rejected.body.data.id}/reject`, { reviewerId: manager.id })).status, 200);
  const yesterday = (await database.query("SELECT (CURRENT_DATE - 1)::text AS yesterday")).rows[0].yesterday;
  const past = await createLeave(yesterday, yesterday, 'Approved yesterday');
  assert.equal((await request(baseUrl, 'PATCH', `/api/leave-requests/${past.body.data.id}/approve`, { reviewerId: manager.id })).status, 200);

  const onLeave = await request(baseUrl, 'GET', '/api/reports/employees-on-leave-today');
  assert.equal(onLeave.status, 200);
  assert.equal(onLeave.body.data.length, 1);
  assert.equal(onLeave.body.data[0].id, employee.id);
  assert.equal(onLeave.body.data[0].departmentName, 'Report department');
  assert.equal(onLeave.body.data[0].leave.startDate, today);

  const hierarchy = await request(baseUrl, 'GET', `/api/reports/employees/${employee.id}/hierarchy`);
  assert.equal(hierarchy.status, 200);
  assert.deepEqual(hierarchy.body.data.map(({ id }) => id), [employee.id, manager.id, root.id]);
  assert.deepEqual(hierarchy.body.data.map(({ level }) => level), [0, 1, 2]);
  const topLevel = await request(baseUrl, 'GET', `/api/reports/employees/${root.id}/hierarchy`);
  assert.deepEqual(topLevel.body.data.map(({ id }) => id), [root.id]);
  assert.equal((await request(baseUrl, 'GET', '/api/reports/employees/not-an-id/hierarchy')).status, 400);
  assert.equal((await request(baseUrl, 'GET', '/api/reports/employees/99999999/hierarchy')).status, 404);

  // A malformed cycle must terminate with each employee at most once.
  await database.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [employee.id, root.id]);
  const cyclicHierarchy = await request(baseUrl, 'GET', `/api/reports/employees/${employee.id}/hierarchy`);
  assert.equal(cyclicHierarchy.body.data.length, 3);
  await database.query('UPDATE employees SET manager_id = NULL WHERE id = $1', [root.id]);
  assert.ok(pending.body.data.id);

  const firstSeed = await seedDatabase(database);
  const secondSeed = await seedDatabase(database);
  assert.equal(firstSeed.employeeCount, 60);
  assert.equal(firstSeed.insertedEmployees, 60);
  assert.equal(secondSeed.insertedEmployees, 0);
  assert.equal((await database.query("SELECT count(*)::int AS total FROM employees WHERE email LIKE 'seed.employee.%@fictional.example'")).rows[0].total, 60);
});
