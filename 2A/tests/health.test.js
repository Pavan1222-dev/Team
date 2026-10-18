import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import request from 'supertest';
import app from '../app.js';
import { createDatabase } from '../db/database.js';

let temporaryDirectory;

before(async () => {
  temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'library-api-'));
});

after(async () => {
  await rm(temporaryDirectory, { recursive: true, force: true });
});

test('GET /health returns the standard success response without starting a server', async () => {
  const response = await request(app).get('/health');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    success: true,
    data: { status: 'ok' },
    error: null,
  });
});

test('database initialization creates the library tables and enables foreign keys', async () => {
  const database = await createDatabase(path.join(temporaryDirectory, 'library.sqlite'));

  try {
    const tables = await database.all(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('books', 'members', 'loans')",
    );
    const foreignKeys = await database.get('PRAGMA foreign_keys');

    assert.deepEqual(tables.map(({ name }) => name).sort(), ['books', 'loans', 'members']);
    assert.equal(foreignKeys.foreign_keys, 1);
  } finally {
    await database.close();
  }
});

test('unmatched routes use the standard error response', async () => {
  const response = await request(app).get('/not-implemented');

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
  assert.equal(response.body.data, null);
  assert.equal(response.body.error.message, 'Route not found.');
});
