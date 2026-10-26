import { createServer } from 'node:http';
import {
  createShortUrl,
  findShortUrl,
  getStatistics,
  recordClick,
  removeShortUrl
} from './services.js';

const MAX_BODY_BYTES = 16 * 1024;

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(JSON.stringify(data));
}

async function readJsonBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
      const error = new Error('Request body is too large.');
      error.statusCode = 413;
      throw error;
    }
  }

  try {
    return JSON.parse(body);
  } catch {
    const error = new Error('Request body must contain valid JSON.');
    error.statusCode = 400;
    throw error;
  }
}

async function handleRequest(request, response) {
  const url = new URL(request.url, 'http://localhost');
  const statsMatch = url.pathname.match(/^\/api\/urls\/([A-Za-z0-9_-]{4,32})\/stats$/);
  const urlMatch = url.pathname.match(/^\/api\/urls\/([A-Za-z0-9_-]{4,32})$/);
  const redirectMatch = url.pathname.match(/^\/([A-Za-z0-9_-]{4,32})$/);

  if (url.pathname === '/api/shorten' && request.method === 'POST') {
    const body = await readJsonBody(request);
    return sendJson(response, 201, { success: true, data: await createShortUrl(body) });
  }

  if (statsMatch && request.method === 'GET') {
    const stats = await getStatistics(statsMatch[1]);
    return sendJson(response, stats ? 200 : 404, stats
      ? { success: true, data: stats }
      : { success: false, error: 'Short URL not found or expired.' });
  }

  if (urlMatch && request.method === 'GET') {
    const record = await findShortUrl(urlMatch[1]);
    return sendJson(response, record ? 200 : 404, record
      ? { success: true, data: record }
      : { success: false, error: 'Short URL not found or expired.' });
  }

  if (urlMatch && request.method === 'DELETE') {
    const removed = await removeShortUrl(urlMatch[1]);
    return sendJson(response, removed ? 200 : 404, removed
      ? { success: true, data: { shortCode: urlMatch[1] } }
      : { success: false, error: 'Short URL not found.' });
  }

  if (redirectMatch && request.method === 'GET') {
    const record = await findShortUrl(redirectMatch[1]);
    if (!record) {
      return sendJson(response, 404, { success: false, error: 'Short URL not found or expired.' });
    }
    await recordClick(
      redirectMatch[1],
      typeof request.headers.referer === 'string' ? request.headers.referer.slice(0, 2048) : null,
      typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'].slice(0, 512) : null
    );
    response.writeHead(302, { Location: record.original_url, 'Cache-Control': 'no-store' });
    return response.end();
  }

  if (url.pathname.startsWith('/api/') || request.method !== 'GET') {
    return sendJson(response, 404, { success: false, error: 'Route not found.' });
  }
  return sendJson(response, 404, { success: false, error: 'Short URL not found.' });
}

const server = createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
    if (statusCode >= 500) console.error('[request] Short URL request failed:', error);
    if (!response.headersSent) {
      sendJson(response, statusCode, {
        success: false,
        error: statusCode >= 500 ? 'An unexpected server error occurred.' : error.message
      });
    } else {
      response.destroy();
    }
  });
});

export { server };