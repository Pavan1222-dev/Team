import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createApp } from '../src/app.js';

const servers = new Set();

after(async () => {
  await Promise.all([...servers].map((server) => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  })));
});

async function getJson(app, path) {
  const server = app.listen(0, '127.0.0.1');
  servers.add(server);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  const { port } = server.address();
  return fetch(`http://127.0.0.1:${port}${path}`);
}

test('GET /health returns a healthy response without a database', async () => {
  const response = await getJson(createApp(), '/health');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('GET /health/db returns the database name from a successful query', async () => {
  const database = {
    query: async (sql) => {
      assert.equal(sql, 'SELECT current_database() AS database');
      return { rows: [{ database: 'employee_management' }] };
    },
  };
  const response = await getJson(createApp({ database }), '/health/db');

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: 'ok',
    database: 'employee_management',
  });
});

test('GET /health/db hides database errors and unmatched paths return 404', async () => {
  const database = { query: async () => { throw new Error('private connection detail'); } };
  const failedHealth = await getJson(createApp({ database }), '/health/db');
  const missingRoute = await getJson(createApp(), '/not-a-route');

  assert.equal(failedHealth.status, 503);
  assert.deepEqual(await failedHealth.json(), { error: 'Database health check failed.' });
  assert.equal(missingRoute.status, 404);
  assert.deepEqual(await missingRoute.json(), { error: 'Route not found.' });
});
