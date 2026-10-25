
const express = require("express");
const cron = require("node-cron");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

const db = require("./db");
const { buildReport } = require("./reports");
const { setupMailer, sendEmail } = require("./mailer");

dayjs.extend(utc);
dayjs.extend(timezone);

const app = express();
app.use(express.json());

const TZ = "Asia/Kolkata";
const jobs = new Map();
const running = new Set();

// Load schedules from database and register them
function loadSchedules() {
    const schedules = db.prepare(
        "SELECT * FROM schedules"
    ).all();

    for (const schedule of schedules) {
        registerSchedule(schedule);
    }
}

// Register or update a cron job
function registerSchedule(schedule) {
    const oldJob = jobs.get(schedule.id);

    if (oldJob) oldJob.stop();
    jobs.delete(schedule.id);

    if (schedule.paused) return;

    if (!cron.validate(schedule.cron_expression)) {
        console.log("Invalid cron:", schedule.id);
        return;
    }

    const job = cron.schedule(
        schedule.cron_expression,
        () => runSchedule(schedule.id),
        { timezone: TZ }
    );

    jobs.set(schedule.id, job);
}

// Execute a report schedule
async function runSchedule(id) {
    if (running.has(id)) {
        console.log("Schedule already running:", id);
        return;
    }

    running.add(id);

    const startTime = dayjs().tz(TZ).format("YYYY-MM-DD HH:mm:ss");

    const result = db.prepare(`
        INSERT INTO runs (schedule_id, start_time, status)
        VALUES (?, ?, ?)
    `).run(id, startTime, "running");

    const runId = result.lastInsertRowid;

    try {
        const schedule = db.prepare(
            "SELECT * FROM schedules WHERE id = ?"
        ).get(id);

        if (!schedule || schedule.paused) {
            throw new Error("Schedule not found or paused");
        }

        const filePath = await buildReport(
            schedule.report_type,
            schedule.format
        );

        const recipients = JSON.parse(schedule.recipients);

        let sent = false;
        let lastError;

        // Initial attempt + two retries
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                await sendEmail(recipients.join(","), filePath);
                sent = true;
                break;
            } catch (error) {
                lastError = error;
                console.log(`Email attempt ${attempt} failed`);
            }
        }

        if (!sent) {
            throw lastError || new Error("Email failed");
        }

        db.prepare(`
            UPDATE runs
            SET end_time = ?, status = ?
            WHERE id = ?
        `).run(
            dayjs().tz(TZ).format("YYYY-MM-DD HH:mm:ss"),
            "success",
            runId
        );
    } 
catch (error) {
    db.prepare(`
        UPDATE runs
        SET end_time = ?, status = ?, error_message = ?
        WHERE id = ?
    `).run(
        dayjs().tz(TZ).format("YYYY-MM-DD HH:mm:ss"),
        "failed",
        error.message,
        runId
    );

    console.error("Schedule failed:", error.message);

    // Notify the administrator
    try {
        await sendEmail(
            "divyasrivanapalli21@gmail.com",
            null,
            "Scheduled Report Failed"
        );
    } catch (notifyError) {
        console.error(
            "Admin notification failed:",
            notifyError.message
        );
    }
}finally {
        running.delete(id);
    }
}

// Create a schedule
app.post("/api/schedules", (req, res) => {
    const {
        reportType,
        cronExpression,
        recipients,
        format
    } = req.body;

    if (
        !["daily-sales", "weekly-pending-tasks"].includes(reportType) ||
        !cron.validate(cronExpression) ||
        !Array.isArray(recipients) ||
        recipients.length === 0 ||
        !["PDF", "EXCEL"].includes(String(format).toUpperCase())
    ) {
        return res.status(400).json({
            error: "Invalid schedule details"
        });
    }

    const result = db.prepare(`
        INSERT INTO schedules
        (report_type, cron_expression, recipients, format)
        VALUES (?, ?, ?, ?)
    `).run(
        reportType,
        cronExpression,
        JSON.stringify(recipients),
        format.toUpperCase()
    );

    const schedule = db.prepare(
        "SELECT * FROM schedules WHERE id = ?"
    ).get(result.lastInsertRowid);

    registerSchedule(schedule);

    res.status(201).json(schedule);
});

// List schedules
app.get("/api/schedules", (req, res) => {
    const schedules = db.prepare(
        "SELECT * FROM schedules"
    ).all();

    res.json(schedules);
});

// Update a schedule
app.patch("/api/schedules/:id", (req, res) => {
    const id = Number(req.params.id);

    const schedule = db.prepare(
        "SELECT * FROM schedules WHERE id = ?"
    ).get(id);

    if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
    }

    const cronExpression =
        req.body.cronExpression ?? schedule.cron_expression;

    if (!cron.validate(cronExpression)) {
        return res.status(400).json({ error: "Invalid cron expression" });
    }

    db.prepare(`
        UPDATE schedules SET cron_expression = ? WHERE id = ?
    `).run(cronExpression, id);

    const updated = db.prepare(
        "SELECT * FROM schedules WHERE id = ?"
    ).get(id);

    registerSchedule(updated);

    res.json(updated);
});

// Run immediately
app.post("/api/schedules/:id/run-now", (req, res) => {
    const id = Number(req.params.id);

    const schedule = db.prepare(
        "SELECT * FROM schedules WHERE id = ?"
    ).get(id);

    if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
    }

    if (running.has(id)) {
        return res.status(409).json({ error: "Already running" });
    }

    runSchedule(id);

    res.json({ message: "Report run started" });
});

// Pause a schedule
app.post("/api/schedules/:id/pause", (req, res) => {
    const id = Number(req.params.id);

    db.prepare(
        "UPDATE schedules SET paused = 1 WHERE id = ?"
    ).run(id);

    const schedule = db.prepare(
        "SELECT * FROM schedules WHERE id = ?"
    ).get(id);

    if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
    }

    registerSchedule(schedule);

    res.json({ message: "Schedule paused" });
});

// Resume a schedule
app.post("/api/schedules/:id/resume", (req, res) => {
    const id = Number(req.params.id);

    const schedule = db.prepare(
        "SELECT * FROM schedules WHERE id = ?"
    ).get(id);

    if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
    }

    db.prepare(
        "UPDATE schedules SET paused = 0 WHERE id = ?"
    ).run(id);

    const updated = db.prepare(
        "SELECT * FROM schedules WHERE id = ?"
    ).get(id);

    registerSchedule(updated);

    res.json({ message: "Schedule resumed" });
});

// View run history
app.get("/api/runs", (req, res) => {
    const runs = db.prepare(
        "SELECT * FROM runs ORDER BY id DESC"
    ).all();

    res.json(runs);
});

// Start application
async function start() {
    await setupMailer();

    loadSchedules();

    app.listen(3000, () => {
        console.log("Server running on http://localhost:3000");
    });
}

start().catch(console.error);
