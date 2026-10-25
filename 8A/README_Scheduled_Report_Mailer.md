# Scheduled Report Mailer

A Node.js and Express application that automatically generates sales/task reports in PDF or Excel format and emails them according to a cron schedule.

## Features

- Generate **Daily Sales** reports.
- Generate **Weekly Pending Tasks** reports.
- Export reports as **PDF** or **Excel** files.
- Schedule reports using cron expressions.
- Create, list, update, pause, resume, and run schedules immediately through a REST API.
- Store schedules and execution history in SQLite.
- Retry failed email sends (up to 3 total attempts, if the retry logic in `app.js` is enabled).
- Track report runs and errors.
- Use Day.js with the `Asia/Kolkata` time zone for timestamps.
- Use Ethereal Email for safe email testing.

## Tech Stack

- Node.js
- Express
- SQLite with `better-sqlite3`
- `node-cron`
- PDFKit
- ExcelJS
- Nodemailer and Ethereal Email
- Day.js

## Project Structure

```text
scheduled-report-mailer/
├── app.js          # Express API and scheduled jobs
├── db.js           # SQLite database, tables, and sample data
├── reports.js      # PDF and Excel report generation
├── mailer.js       # SMTP setup and email delivery
├── reports/        # Generated report files (created as needed)
├── reports.db      # SQLite database (created when the app runs)
├── package.json
└── README.md
```

> Your actual folder may use a different name. Keep the file names consistent with your project.

## Requirements

- Node.js and npm installed.
- Postman or another API client for testing.

Check your installation:

```bash
node --version
npm --version
```

## Installation

1. Open a terminal in the project directory.
2. Install dependencies:

```bash
npm install
```

If you have not installed the dependencies yet, use:

```bash
npm install express better-sqlite3 node-cron pdfkit exceljs nodemailer dayjs
```

3. Make sure `package.json` has a start script similar to:

```json
{
  "scripts": {
    "start": "node app.js"
  }
}
```

Do not replace your entire `package.json` with this snippet; add or update the `scripts.start` entry while preserving the rest of the file.

## Run the Application

```bash
npm start
```

The app starts on:

```text
http://localhost:3000
```

On startup, the application initializes the mailer, loads saved schedules from SQLite, registers active cron jobs, and starts the Express server.

## Email Testing with Ethereal

The project uses Ethereal Email for test messages. It is useful for checking email content and attachments without delivering messages to real recipients.

When a report email is sent, the application logs an Ethereal preview URL in the terminal. Open that URL to inspect the message and attachment.

**Important:** Ethereal is a testing service. It does not deliver messages to real inboxes. For production, configure a real SMTP provider and protect its credentials using environment variables rather than hard-coding them.

## API Endpoints

Base URL: `http://localhost:3000`

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/schedules` | Create a report schedule |
| `GET` | `/api/schedules` | List saved schedules |
| `PATCH` | `/api/schedules/:id` | Update a schedule's cron expression |
| `POST` | `/api/schedules/:id/run-now` | Run a report immediately |
| `POST` | `/api/schedules/:id/pause` | Pause a schedule |
| `POST` | `/api/schedules/:id/resume` | Resume a schedule |
| `GET` | `/api/runs` | View report execution history |

### Create a Schedule

Request:

```http
POST http://localhost:3000/api/schedules
Content-Type: application/json
```

Body:

```json
{
  "reportType": "daily-sales",
  "cronExpression": "* * * * *",
  "recipients": ["customer@example.com"],
  "format": "PDF"
}
```

Expected result: `201 Created` with the created schedule details.

Replace `customer@example.com` with the address you want to use for testing. With Ethereal, the message is previewed rather than delivered to that inbox.

Supported report types:

- `daily-sales`
- `weekly-pending-tasks`

Supported formats:

- `PDF`
- `EXCEL`

### Update a Schedule

```http
PATCH http://localhost:3000/api/schedules/1
Content-Type: application/json
```

```json
{
  "cronExpression": "*/2 * * * *"
}
```

This example changes the schedule to run every two minutes. Use an existing schedule ID.

### Pause, Resume, and Run Now

```http
POST http://localhost:3000/api/schedules/1/pause
POST http://localhost:3000/api/schedules/1/resume
POST http://localhost:3000/api/schedules/1/run-now
```

These requests do not require a JSON body in the current implementation.

### View Schedules and Run History

```http
GET http://localhost:3000/api/schedules
GET http://localhost:3000/api/runs
```

Use the schedule ID returned by the create-schedule request instead of `1` if it is different.

## Cron Expression Examples

| Expression | Meaning |
|---|---|
| `* * * * *` | Every minute |
| `*/2 * * * *` | Every two minutes |
| `0 9 * * *` | Every day at 9:00 AM |
| `0 9 * * 1` | Every Monday at 9:00 AM |

Cron schedules use the time zone configured by the application/runtime. This project is configured to use `Asia/Kolkata` for its date/time handling; verify the cron library's configured time-zone behavior in `app.js` if you change it.

## Database Tables

The SQLite database contains these tables:

- `sales` — sample sales records, including product, amount, and sale date.
- `tasks` — task names and statuses.
- `schedules` — report type, cron expression, recipients, format, and paused status.
- `runs` — execution start/end times, status, and any error message.

The database file (`reports.db`) is created locally when the application initializes. Back it up before deleting or replacing it.

## Testing Checklist

- [ ] Start the app with `npm start`.
- [ ] Create a schedule and confirm the API returns `201 Created`.
- [ ] List schedules and verify the new schedule appears.
- [ ] Run the schedule immediately.
- [ ] Check the terminal for the Ethereal preview URL.
- [ ] Open the preview and verify the report attachment.
- [ ] Confirm the run appears in `GET /api/runs`.
- [ ] Pause the schedule and verify it stops triggering automatically.
- [ ] Resume the schedule and verify it becomes active again.
- [ ] Update the cron expression and confirm the schedule is updated.
- [ ] Test an invalid request and verify the API returns an error response.

## Troubleshooting

### `npm start` fails

- Confirm you are in the project folder.
- Run `npm install`.
- Check that `app.js` exists and the `start` script points to it.

### SQLite says a column is missing

The local `reports.db` may have been created with an older table structure. Keep the migration/check logic in `db.js` so it adds missing columns safely. Back up the database before making schema changes.

### No report rows appear

The sample sales report may fall back to sample data when there are no sales for today, depending on the current `reports.js` implementation. Check the SQL query and date values in `reports.db`.

### No email arrives in a real inbox

Ethereal is for testing and does not deliver to real inboxes. Open the preview URL printed in the terminal. For real delivery, configure a production SMTP service.

### The scheduled report does not run

- Confirm the schedule is not paused.
- Check that the cron expression is valid.
- Check `GET /api/schedules` and `GET /api/runs`.
- Keep the Node.js process running; cron jobs stop when the process stops.

## Security and Production Notes

Before using this application in production:

- Store SMTP credentials and other secrets in environment variables.
- Add authentication and authorization to the API.
- Validate and restrict recipient email addresses.
- Add request logging and stronger error monitoring.
- Consider a persistent job queue and distributed locking if multiple server instances will run.
- Configure backups and retention for the SQLite database and generated reports.
- Replace Ethereal with a real email provider.

## License

No license has been specified for this project yet.
