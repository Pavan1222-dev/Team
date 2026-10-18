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

function poolOptions(database, schema) {
  return {
    host: process.env.TEST_DB_HOST || process.env.DB_HOST,
    port: Number(process.env.TEST_DB_PORT || process.env.DB_PORT),
    database,
    user: process.env.TEST_DB_USER || process.env.DB_USER,
    password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD,
    ...(schema ? { options: `-c search_path=${schema},public` } : {}),
  };
}

async function startServer(app) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

async function request(baseUrl, method, route, body) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    body: response.status === 204 ? null : await response.json(),
  };
}

test('department and employee REST APIs validate, search, and enforce schema relationships', { skip: skipReason }, async (context) => {
  const schema = `api_test_${randomUUID().replaceAll('-', '')}`;
  const adminPool = new Pool(poolOptions(testDatabaseName));
  let schemaCreated = false;
  let database;
  let server;

  context.after(async () => {
    if (server) await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    if (database) await database.end();
    if (schemaCreated) await adminPool.query(`DROP SCHEMA "${schema}" CASCADE`);
    await adminPool.end();
  });

  assert.notEqual(testDatabaseName, developmentDatabaseName);
  await adminPool.query(`CREATE SCHEMA "${schema}"`);
  schemaCreated = true;
  database = new Pool(poolOptions(testDatabaseName, schema));

  for (const filename of [
    '001_create_departments.sql',
    '002_create_employees.sql',
    '003_create_leave_requests.sql',
  ]) {
    const sql = await fs.readFile(path.join(projectDirectory, 'migrations', filename), 'utf8');
    await database.query(sql);
  }

  ({ server } = await startServer(createApp({ database })));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  assert.equal((await request(baseUrl, 'GET', '/api/departments', undefined)).body.data.pagination.totalItems, 0);
  assert.equal((await request(baseUrl, 'GET', '/api/employees', undefined)).body.data.pagination.totalItems, 0);
  const invalidDepartment = await request(baseUrl, 'POST', '/api/departments', {});
  assert.equal(invalidDepartment.status, 400);
  const engineeringResult = await request(baseUrl, 'POST', '/api/departments', {
    name: '  Engineering  ', description: 'Product engineering',
  });
  assert.equal(engineeringResult.status, 201);
  const engineering = engineeringResult.body.data;
  assert.equal(engineering.name, 'Engineering');

  const salesResult = await request(baseUrl, 'POST', '/api/departments', { name: 'Sales' });
  assert.equal(salesResult.status, 201);
  const sales = salesResult.body.data;
  assert.equal((await request(baseUrl, 'POST', '/api/departments', { name: 'Engineering' })).status, 409);

  const departmentList = await request(baseUrl, 'GET', '/api/departments?page=1&limit=1', undefined);
  assert.equal(departmentList.status, 200);
  assert.equal(departmentList.body.data.items.length, 1);
  assert.equal(departmentList.body.data.pagination.totalItems, 2);
  assert.equal(departmentList.body.data.pagination.totalPages, 2);
  assert.equal((await request(baseUrl, 'GET', '/api/departments?name=engin', undefined)).body.data.pagination.totalItems, 1);
  const departmentGet = await request(baseUrl, 'GET', `/api/departments/${engineering.id}`, undefined);
  assert.equal(departmentGet.body.data.id, engineering.id);
  assert.equal((await request(baseUrl, 'GET', '/api/departments/nope', undefined)).status, 400);
  assert.equal((await request(baseUrl, 'GET', '/api/departments/99999999', undefined)).status, 404);

  const managerResult = await request(baseUrl, 'POST', '/api/employees', {
    firstName: ' Alice ', lastName: 'Smith', email: 'ALICE@example.com',
    departmentId: engineering.id, joiningDate: '2024-01-10',
  });
  assert.equal(managerResult.status, 201);
  const manager = managerResult.body.data;
  assert.equal(manager.firstName, 'Alice');
  assert.equal(manager.email, 'alice@example.com');
  assert.equal(manager.departmentName, 'Engineering');

  const missingDepartment = await request(baseUrl, 'POST', '/api/employees', {
    firstName: 'Nobody', lastName: 'Here', email: 'nobody@example.com', departmentId: '99999999',
  });
  assert.equal(missingDepartment.status, 404);
  const badEmail = await request(baseUrl, 'POST', '/api/employees', {
    firstName: 'Bad', lastName: 'Email', email: 'invalid', departmentId: engineering.id,
  });
  assert.equal(badEmail.status, 400);
  const duplicateEmail = await request(baseUrl, 'POST', '/api/employees', {
    firstName: 'Another', lastName: 'Alice', email: 'alice@example.com', departmentId: sales.id,
  });
  assert.equal(duplicateEmail.status, 409);

  const bobResult = await request(baseUrl, 'POST', '/api/employees', {
    firstName: 'Bob', lastName: 'Jones', email: 'bob@example.com',
    departmentId: engineering.id, managerId: manager.id, joiningDate: '2024-06-15',
  });
  assert.equal(bobResult.status, 201);
  const bob = bobResult.body.data;
  assert.equal(String(bob.managerId), String(manager.id));

  const carolResult = await request(baseUrl, 'POST', '/api/employees', {
    firstName: 'Carol', lastName: 'White', email: 'carol@example.com',
    departmentId: sales.id, managerId: manager.id, joiningDate: '2025-02-20',
  });
  assert.equal(carolResult.status, 201);
  const carol = carolResult.body.data;

  assert.equal((await request(baseUrl, 'POST', '/api/employees', {
    firstName: 'No', lastName: 'Manager', email: 'nomgr@example.com',
    departmentId: engineering.id, managerId: '99999999',
  })).status, 404);
  assert.equal((await request(baseUrl, 'PUT', `/api/employees/${manager.id}`, {
    managerId: manager.id,
  })).status, 400);

  const employeeList = await request(baseUrl, 'GET', '/api/employees?page=1&limit=2&sortBy=firstName&order=asc', undefined);
  assert.equal(employeeList.status, 200);
  assert.equal(employeeList.body.data.items.length, 2);
  assert.equal(employeeList.body.data.pagination.totalItems, 3);
  assert.equal(employeeList.body.data.pagination.totalPages, 2);
  assert.equal((await request(baseUrl, 'GET', '/api/employees?name=bo', undefined)).body.data.items[0].id, bob.id);
  assert.equal((await request(baseUrl, 'GET', '/api/employees?department=Eng', undefined)).body.data.pagination.totalItems, 2);
  assert.equal((await request(baseUrl, 'GET', '/api/employees?joiningDateFrom=2024-06-01&joiningDateTo=2024-12-31', undefined)).body.data.pagination.totalItems, 1);
  const combined = await request(baseUrl, 'GET', '/api/employees?name=jo&department=Eng&joiningDateFrom=2024-01-01&joiningDateTo=2024-12-31', undefined);
  assert.equal(combined.body.data.pagination.totalItems, 1);
  assert.equal(combined.body.data.items[0].id, bob.id);
  assert.equal((await request(baseUrl, 'GET', '/api/employees?page=0', undefined)).status, 400);
  assert.equal((await request(baseUrl, 'GET', '/api/employees?sortBy=leaveBalanceDays', undefined)).status, 400);
  assert.equal((await request(baseUrl, 'GET', '/api/employees/invalid', undefined)).status, 400);
  assert.equal((await request(baseUrl, 'GET', '/api/employees/99999999', undefined)).status, 404);

  const employeeUpdate = await request(baseUrl, 'PUT', `/api/employees/${bob.id}`, {
    lastName: 'Jones-Updated', departmentId: sales.id,
  });
  assert.equal(employeeUpdate.status, 200);
  assert.equal(employeeUpdate.body.data.lastName, 'Jones-Updated');
  assert.equal(employeeUpdate.body.data.departmentName, 'Sales');
  const departmentUpdate = await request(baseUrl, 'PUT', `/api/departments/${sales.id}`, { description: 'Revenue team' });
  assert.equal(departmentUpdate.status, 200);
  assert.equal(departmentUpdate.body.data.description, 'Revenue team');
  assert.equal((await request(baseUrl, 'PUT', `/api/departments/${sales.id}`, { id: 25 })).status, 400);

  assert.equal((await request(baseUrl, 'DELETE', `/api/departments/${engineering.id}`, undefined)).status, 409);
  assert.equal((await request(baseUrl, 'DELETE', '/api/departments/99999999', undefined)).status, 404);
  assert.equal((await request(baseUrl, 'DELETE', '/api/employees/invalid', undefined)).status, 400);

  await database.query(
    `INSERT INTO leave_requests (employee_id, start_date, end_date, reason)
     VALUES ($1, CURRENT_DATE, CURRENT_DATE, $2)`,
    [carol.id, 'Protect leave history'],
  );
  const blockedEmployeeDelete = await request(baseUrl, 'DELETE', `/api/employees/${carol.id}`, undefined);
  assert.equal(blockedEmployeeDelete.status, 409);
  assert.match(blockedEmployeeDelete.body.error, /referenced|cannot be deleted/i);

  assert.equal((await request(baseUrl, 'DELETE', `/api/employees/${bob.id}`, undefined)).status, 204);
  assert.equal((await request(baseUrl, 'GET', `/api/employees/${bob.id}`, undefined)).status, 404);
  assert.equal((await request(baseUrl, 'DELETE', `/api/employees/${manager.id}`, undefined)).status, 204);
  assert.equal((await request(baseUrl, 'DELETE', `/api/departments/${engineering.id}`, undefined)).status, 204);
  assert.equal((await request(baseUrl, 'DELETE', `/api/departments/${sales.id}`, undefined)).status, 409);
  assert.ok(carol.id);
});
