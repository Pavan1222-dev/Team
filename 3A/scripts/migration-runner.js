import fs from 'node:fs/promises';
import path from 'node:path';

const MIGRATION_LOCK_KEY = Object.freeze([683021, 3]);

async function applyPendingMigrations(client, migrationsDirectory, logger) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const filenames = (await fs.readdir(migrationsDirectory))
    .filter((filename) => filename.endsWith('.sql'))
    .sort();

  for (const filename of filenames) {
    const existing = await client.query(
      'SELECT 1 FROM schema_migrations WHERE filename = $1',
      [filename],
    );
    if (existing.rowCount > 0) {
      logger.log(`Skipped ${filename} (already applied).`);
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDirectory, filename), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [filename],
      );
      await client.query('COMMIT');
      logger.log(`Applied ${filename}.`);
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw new Error(`Migration ${filename} failed: ${error.message}`, { cause: error });
    }
  }

  if (filenames.length === 0) {
    logger.log('No SQL migration files found.');
  }
}

export async function runMigrations({ pool, migrationsDirectory, logger = console }) {
  const client = await pool.connect();
  let lockAcquired = false;
  let migrationError;

  try {
    await client.query('SELECT pg_advisory_lock($1, $2)', MIGRATION_LOCK_KEY);
    lockAcquired = true;
    await applyPendingMigrations(client, migrationsDirectory, logger);
  } catch (error) {
    migrationError = error;
    throw error;
  } finally {
    let destroyClient = false;
    let unlockError;

    if (lockAcquired) {
      try {
        const result = await client.query(
          'SELECT pg_advisory_unlock($1, $2) AS unlocked',
          MIGRATION_LOCK_KEY,
        );
        if (result.rows[0]?.unlocked !== true) {
          throw new Error('Migration advisory lock was not held during cleanup.');
        }
      } catch (error) {
        destroyClient = true;
        unlockError = error;
      }
    }

    // Destroying a connection whose lock could not be released makes PostgreSQL release it.
    client.release(destroyClient);

    if (unlockError) {
      if (migrationError) {
        logger.error('Migration lock cleanup failed; the database connection was discarded.');
      } else {
        throw new Error('Could not release the migration advisory lock.', { cause: unlockError });
      }
    }
  }
}

export async function runMigrationCommand(options) {
  let result;
  let commandError;

  try {
    result = await runMigrations(options);
  } catch (error) {
    commandError = error;
  }

  try {
    await options.pool.end();
  } catch (error) {
    commandError ??= error;
  }

  if (commandError) {
    throw commandError;
  }

  return result;
}
