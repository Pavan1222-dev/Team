import { randomBytes } from 'node:crypto';
import { getDatabase } from './db.js';

const CODE_PATTERN = /^[A-Za-z0-9_-]{4,32}$/;

function validateDestination(value) {
  if (typeof value !== 'string' || value.length > 2048) {
    const error = new Error('url must be a string no longer than 2048 characters.');
    error.statusCode = 400;
    throw error;
  }

  let destination;
  try {
    destination = new URL(value);
  } catch {
    const error = new Error('url must be a valid absolute URL.');
    error.statusCode = 400;
    throw error;
  }

  if (!['http:', 'https:'].includes(destination.protocol)) {
    const error = new Error('Only http and https URLs can be shortened.');
    error.statusCode = 400;
    throw error;
  }
  return destination.toString();
}

function validateExpiration(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    const error = new Error('expiresAt must be a valid date-time string.');
    error.statusCode = 400;
    throw error;
  }

  const expiration = new Date(value);
  if (expiration.getTime() <= Date.now()) {
    const error = new Error('expiresAt must be in the future.');
    error.statusCode = 400;
    throw error;
  }
  return expiration.toISOString();
}

async function createShortUrl(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    const error = new Error('Request body must be a JSON object.');
    error.statusCode = 400;
    throw error;
  }

  const originalUrl = validateDestination(body.url);
  const expiresAt = validateExpiration(body.expiresAt);
  const database = getDatabase();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const shortCode = randomBytes(5).toString('base64url');
    try {
      await database.run(
        'INSERT INTO urls (short_code, original_url, expires_at) VALUES (?, ?, ?)',
        [shortCode, originalUrl, expiresAt]
      );
      return { shortCode, originalUrl, expiresAt };
    } catch (error) {
      if (!String(error.message).includes('UNIQUE constraint failed')) throw error;
    }
  }
  throw new Error('Could not allocate a unique short code.');
}

async function findShortUrl(shortCode) {
  if (!CODE_PATTERN.test(shortCode)) return null;
  const record = await getDatabase().get(
    'SELECT short_code, original_url, created_at, expires_at FROM urls WHERE short_code = ?',
    [shortCode]
  );
  if (record?.expires_at && Date.parse(record.expires_at) <= Date.now()) return null;
  return record || null;
}

async function recordClick(shortCode, referrer, userAgent) {
  await getDatabase().run(
    'INSERT INTO clicks (short_code, referrer, user_agent) VALUES (?, ?, ?)',
    [shortCode, referrer || null, userAgent || null]
  );
}

async function getStatistics(shortCode) {
  if (!CODE_PATTERN.test(shortCode)) return null;
  const url = await findShortUrl(shortCode);
  if (!url) return null;
  const result = await getDatabase().get(
    'SELECT COUNT(*) AS clicks FROM clicks WHERE short_code = ?',
    [shortCode]
  );
  return { ...url, clicks: result.clicks };
}

async function removeShortUrl(shortCode) {
  if (!CODE_PATTERN.test(shortCode)) return false;
  const result = await getDatabase().run(
    'DELETE FROM urls WHERE short_code = ?',
    [shortCode]
  );
  return result.changes > 0;
}

export {
  createShortUrl,
  findShortUrl,
  getStatistics,
  recordClick,
  removeShortUrl
};