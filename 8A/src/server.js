import http from 'node:http';
import cron from 'node-cron';
import config from './config.js';
import { initializeDatabase, getDatabase } from './database.js';
import { startMailer, createReport, sendReportEmail, sendAdminEmail } from './reports.js';
import { nowInIst } from './time.js';

const tasks = new Map();
const runningSchedules = new Set();

async function readBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body, 'utf8') > 1024 * 1024) {
      throw new Error('Request body is too large');
    }
  }
  return JSON.parse(body);
}

function sendJson(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(data));
}

function validateSchedule(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Request body must be a JSON object');
  }
  if (!['daily_sales_summary', 'weekly_pending_tasks'].includes(body.reportType)) {
    throw new Error('reportType must be daily_sales_summary or weekly_pending_tasks');
  }
  if (typeof body.cronExpression !== 'string' || !cron.validate(body.cronExpression)) {
    throw new Error('cronExpression must be a valid cron expression');
  }
  if (
    !Array.isArray(body.recipients) ||
    body.recipients.length === 0 ||
    body.recipients.some((email) => typeof email !== 'string' || !email.includes('@'))
  ) {
    throw new Error('recipients must be a non-empty array of email addresses');
  }
  if (!['pdf', 'excel'].includes(body.format)) {
    throw new Error('format must be pdf or excel');
  }
}

async function getSchedule(id) {
  const schedule = await getDatabase().get('SELECT * FROM schedules WHERE id = ?', id);
  if (schedule) {
    schedule.recipients = JSON.parse(schedule.recipients);
    schedule.is_paused = Boolean(schedule.is_paused);
  }
  return schedule;
}

function startSchedule(schedule) {
  const task = cron.schedule(schedule.cron_expression, () => {
    runSchedule(schedule.id, 'scheduled').catch((error) => {
      console.error(`Schedule ${schedule.id} failed:`, error);
    });
  }, { timezone: config.timezone });
  tasks.set(schedule.id, task);
}

function stopSchedule(id) {
  tasks.get(id)?.stop();
  tasks.delete(id);
}

async function runSchedule(id, trigger) {
  if (runningSchedules.has(id)) {
    return { conflict: true };
  }
  runningSchedules.add(id);

  const db = getDatabase();
  let schedule;
  let runId;
  let reportPath;

  try {
    schedule = await getSchedule(id);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const result = await db.run(
      `INSERT INTO run_history (schedule_id, trigger_source, started_at, status)
       VALUES (?, ?, ?, 'running')`,
      id,
      trigger,
      nowInIst()
    );
    runId = result.lastID;

    const report = await createReport(schedule);
    reportPath = report.filePath;
    let emailError;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await sendReportEmail(schedule, report);
        emailError = null;
        break;
      } catch (error) {
        emailError = error;
        console.error(`Email attempt ${attempt} of 3 failed: ${error.message}`);
      }
    }
    if (emailError) {
      throw new Error(`Email failed after 3 attempts: ${emailError.message}`);
    }

    await db.run(
      "UPDATE run_history SET ended_at = ?, status = 'success', report_path = ? WHERE id = ?",
      nowInIst(),
      reportPath,
      runId
    );
  } catch (error) {
    if (!runId) {
      throw error;
    }

    await db.run(
      "UPDATE run_history SET ended_at = ?, status = 'failed', error_message = ?, report_path = ? WHERE id = ?",
      nowInIst(),
      error.message,
      reportPath || null,
      runId
    );

    try {
      await sendAdminEmail(runId, id, error.message);
    } catch (notifyError) {
      console.error('Could not send admin notification:', notifyError.message);
    }
  } finally {
    runningSchedules.delete(id);
  }

  return db.get('SELECT * FROM run_history WHERE id = ?', runId);
}

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const path = url.pathname;
  const db = getDatabase();

  try {
    if (path === '/api/schedules' && request.method === 'GET') {
      const schedules = await db.all('SELECT * FROM schedules ORDER BY id');
      for (const schedule of schedules) {
        schedule.recipients = JSON.parse(schedule.recipients);
        schedule.is_paused = Boolean(schedule.is_paused);
      }
      return sendJson(response, 200, { schedules });
    }

    if (path === '/api/schedules' && request.method === 'POST') {
      const body = await readBody(request);
      validateSchedule(body);
      const now = nowInIst();
      const result = await db.run(
        `INSERT INTO schedules
          (report_type, cron_expression, recipients, format, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        body.reportType,
        body.cronExpression,
        JSON.stringify(body.recipients),
        body.format,
        now,
        now
      );
      const schedule = await getSchedule(result.lastID);
      startSchedule(schedule);
      return sendJson(response, 201, { schedule });
    }

    const scheduleMatch = path.match(/^\/api\/schedules\/(\d+)(?:\/(run|pause|resume))?$/);
    if (scheduleMatch) {
      const id = Number(scheduleMatch[1]);
      const action = scheduleMatch[2];
      const current = await getSchedule(id);
      if (!current) {
        return sendJson(response, 404, { error: 'Schedule not found' });
      }

      if (!action && request.method === 'GET') {
        return sendJson(response, 200, { schedule: current });
      }

      if (!action && request.method === 'PUT') {
        const body = await readBody(request);
        validateSchedule(body);
        await db.run(
          `UPDATE schedules
           SET report_type = ?, cron_expression = ?, recipients = ?, format = ?, updated_at = ?
           WHERE id = ?`,
          body.reportType,
          body.cronExpression,
          JSON.stringify(body.recipients),
          body.format,
          nowInIst(),
          id
        );
        const updated = await getSchedule(id);
        stopSchedule(id);
        if (!updated.is_paused) {
          startSchedule(updated);
        }
        return sendJson(response, 200, { schedule: updated });
      }

      if (action === 'run' && request.method === 'POST') {
        const run = await runSchedule(id, 'manual');
        if (run.conflict) {
          return sendJson(response, 409, { error: 'This schedule is already running' });
        }
        return sendJson(response, 200, { run });
      }

      if ((action === 'pause' || action === 'resume') && request.method === 'POST') {
        const paused = action === 'pause';
        await db.run(
          'UPDATE schedules SET is_paused = ?, updated_at = ? WHERE id = ?',
          paused ? 1 : 0,
          nowInIst(),
          id
        );
        stopSchedule(id);
        const updated = await getSchedule(id);
        if (!paused) {
          startSchedule(updated);
        }
        return sendJson(response, 200, { schedule: updated });
      }
    }

    if (path === '/api/runs' && request.method === 'GET') {
      const scheduleId = url.searchParams.get('scheduleId');
      const runs = scheduleId
        ? await db.all('SELECT * FROM run_history WHERE schedule_id = ? ORDER BY id DESC', scheduleId)
        : await db.all('SELECT * FROM run_history ORDER BY id DESC');
      return sendJson(response, 200, { runs });
    }

    const runMatch = path.match(/^\/api\/runs\/(\d+)$/);
    if (runMatch && request.method === 'GET') {
      const run = await db.get('SELECT * FROM run_history WHERE id = ?', runMatch[1]);
      return sendJson(response, run ? 200 : 404, run ? { run } : { error: 'Run not found' });
    }

    sendJson(response, 404, { error: 'Route not found' });
  } catch (error) {
    const status = error.message.includes('not found')
      ? 404
      : error.message.includes('too large')
        ? 413
        : error instanceof SyntaxError || error.message.includes('must be')
          ? 400
          : 500;
    if (status === 500) {
      console.error('Request failed:', error);
    }
    sendJson(response, status, {
      error: status >= 500 ? 'An unexpected server error occurred.' : error.message
    });
  }
}

async function startServer() {
  const db = await initializeDatabase();
  await startMailer();
  const schedules = await db.all('SELECT * FROM schedules WHERE is_paused = 0');
  for (const schedule of schedules) {
    startSchedule(schedule);
  }

  http.createServer(handleRequest).listen(config.port, () => {
    console.info(`Scheduled report mailer listening at http://localhost:${config.port}`);
  });
}

startServer().catch((error) => {
  console.error('Server could not start:', error);
  process.exitCode = 1;
});
