# Scheduled Report Mailer

A small Node.js service that schedules reports, creates PDF or Excel files, and emails them to recipients. It uses SQLite for schedules, sample data, and run history. Cron jobs use `Asia/Kolkata`.

## Setup and configuration

```powershell
npm install
Copy-Item .env.example .env
# Edit .env with your SMTP settings, or leave SMTP_HOST empty to use Ethereal.
npm start
```

The service loads `.env` automatically. The available variables are:

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | HTTP listening port | `3000` |
| `ADMIN_EMAIL` | Receives failure notifications | `admin@example.com` |
| `SMTP_HOST` | SMTP server hostname | Empty (use Ethereal) |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_SECURE` | Use implicit TLS (`true` or `false`) | `false` |
| `SMTP_USER` | SMTP username | Empty |
| `SMTP_PASSWORD` | SMTP password or app password | Empty |

Without SMTP settings, the service uses Ethereal and prints a preview link in the server window. Ethereal captures the message; it does not deliver it to an inbox.

`.env.example` contains placeholders only. Keep the real `.env` local and never
commit it. The SQLite file is created at `data/scheduler.sqlite`. Sample sales
and tasks are added only when their tables are empty. Generated reports are
saved in `reports/generated/` and are not tracked.

## API

All endpoints use JSON. Replace `3000` below if `PORT` is set to another value.

Create a schedule:

```http
POST /api/schedules
Content-Type: application/json

{
  "reportType": "daily_sales_summary",
  "cronExpression": "0 9 * * *",
  "recipients": ["reports@example.com"],
  "format": "pdf"
}
```

`reportType` can be `daily_sales_summary` or `weekly_pending_tasks`. `format` can be `pdf` or `excel`. The weekly task report covers the current Monday-to-Sunday week.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/schedules` | List schedules |
| `GET` | `/api/schedules/:id` | Read a schedule |
| `PUT` | `/api/schedules/:id` | Update schedule and cron expression |
| `POST` | `/api/schedules/:id/run` | Run now |
| `POST` | `/api/schedules/:id/pause` | Pause schedule |
| `POST` | `/api/schedules/:id/resume` | Resume schedule |
| `GET` | `/api/runs` | View run history |
| `GET` | `/api/runs?scheduleId=:id` | View runs for a schedule |
| `GET` | `/api/runs/:id` | Read one run |

The update endpoint replaces the cron job immediately. A schedule cannot run twice at once. Failed report emails are attempted three times total; after that, the run is marked failed and the service attempts to email the admin.

## Design decisions

- The built-in HTTP server provides a small JSON API without an additional web
  framework.
- SQLite persists schedules, sample report data, and run history; cron jobs are
  reconstructed from stored schedules at startup.
- SMTP settings are environment-based, with Ethereal used for a safe preview
  when no SMTP host is configured.
- Report files and database state are runtime outputs, not source files.
- Request bodies and schedule fields are validated, and background execution
  failures are logged and recorded in run history.
