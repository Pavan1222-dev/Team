import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { runMigrationCommand } from '../scripts/migration-runner.js';

async function withMigrationFiles(files, run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'employee-migrations-'));
  try {
    await Promise.all(Object.entries(files).map(([filename, sql]) => (
      fs.writeFile(path.join(directory, filename), sql)
    )));
    await run(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

function fakePool({ failSql, failUnlock = false } = {}) {
  const calls = [];
  let connectionReleased;
  let poolClosed = false;
  const client = {
    async query(sql, values = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      calls.push({ sql: normalized, values });
      if (normalized.startsWith('SELECT pg_advisory_unlock') && failUnlock) {
        throw new Error('forced unlock failure');
      }
      if (normalized.startsWith('SELECT pg_advisory_unlock')) {
        return { rows: [{ unlocked: true }], rowCount: 1 };
      }
      if (normalized.startsWith('SELECT 1 FROM schema_migrations')) {
        return { rows: [], rowCount: 0 };
      }
      if (normalized.startsWith('SELECT pg_advisory_lock')) {
        return { rows: [{}], rowCount: 1 };
      }
      if (normalized === failSql) throw new Error('forced migration failure');
      return { rows: [], rowCount: 1 };
    },
    release(destroy = false) {
      connectionReleased = destroy;
    },
  };
  const pool = {
    async connect() { return client; },
    async end() { poolClosed = true; },
  };

  return {
    pool,
    calls,
    client,
    wasConnectionDestroyed: () => connectionReleased,
    wasPoolClosed: () => poolClosed,
  };
}

const silentLogger = { log() {}, error() {} };

test('migration runner sorts files, unlocks, releases the client, and closes the pool on success', async () => {
  await withMigrationFiles({ '002_second.sql': 'SELECT 2;', '001_first.sql': 'SELECT 1;' }, async (directory) => {
    const fake = fakePool();
    await runMigrationCommand({ pool: fake.pool, migrationsDirectory: directory, logger: silentLogger });

    const sqlCalls = fake.calls.map(({ sql }) => sql);
    const trackingTableIndex = sqlCalls.findIndex((sql) => sql.startsWith('CREATE TABLE IF NOT EXISTS schema_migrations'));
    assert.ok(sqlCalls.indexOf('SELECT pg_advisory_lock($1, $2)') < trackingTableIndex);
    assert.ok(sqlCalls.indexOf('SELECT 1;') < sqlCalls.indexOf('SELECT 2;'));
    assert.ok(sqlCalls.some((sql) => sql.startsWith('SELECT pg_advisory_unlock')));
    assert.equal(fake.wasConnectionDestroyed(), false);
    assert.equal(fake.wasPoolClosed(), true);
  });
});

test('migration failure rolls back and still unlocks, releases the client, and closes the pool', async () => {
  await withMigrationFiles({ '001_failure.sql': 'FAIL THIS MIGRATION;' }, async (directory) => {
    const fake = fakePool({ failSql: 'FAIL THIS MIGRATION;' });

    await assert.rejects(
      runMigrationCommand({ pool: fake.pool, migrationsDirectory: directory, logger: silentLogger }),
      /Migration 001_failure\.sql failed/,
    );

    const sqlCalls = fake.calls.map(({ sql }) => sql);
    assert.ok(sqlCalls.includes('ROLLBACK'));
    assert.ok(sqlCalls.some((sql) => sql.startsWith('SELECT pg_advisory_unlock')));
    assert.equal(sqlCalls.some((sql) => sql.startsWith('INSERT INTO schema_migrations')), false);
    assert.equal(fake.wasConnectionDestroyed(), false);
    assert.equal(fake.wasPoolClosed(), true);
  });
});

test('migration runner destroys the connection if it cannot release the advisory lock', async () => {
  await withMigrationFiles({}, async (directory) => {
    const fake = fakePool({ failUnlock: true });

    await assert.rejects(
      runMigrationCommand({ pool: fake.pool, migrationsDirectory: directory, logger: silentLogger }),
      /Could not release the migration advisory lock/,
    );

    assert.equal(fake.wasConnectionDestroyed(), true);
    assert.equal(fake.wasPoolClosed(), true);
  });
});
