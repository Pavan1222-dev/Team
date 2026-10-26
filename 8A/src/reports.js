import fs from 'node:fs/promises';
import fileSystem from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import nodemailer from 'nodemailer';
import config from './config.js';
import { getDatabase } from './database.js';
import { getReportPeriod } from './time.js';

let mailer;
let usingEthereal = false;

async function startMailer() {
  if (config.smtp.host) {
    mailer = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user
        ? { user: config.smtp.user, pass: config.smtp.password }
        : undefined
    });
  } else {
    const account = await nodemailer.createTestAccount();
    mailer = nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: { user: account.user, pass: account.pass }
    });
    usingEthereal = true;
  }

  await mailer.verify();
  console.info(usingEthereal ? 'Ethereal SMTP connection verified.' : 'SMTP connection verified.');
}

async function createReport(schedule) {
  const db = getDatabase();
  const period = getReportPeriod(schedule.report_type);
  let title;
  let columns;
  let rows;

  if (schedule.report_type === 'daily_sales_summary') {
    const sales = await db.get(
      `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
       FROM sales WHERE sold_at >= ? AND sold_at < ?`,
      period.start,
      period.end
    );
    title = 'Daily Sales Summary';
    columns = ['Measure', 'Value'];
    rows = [['Orders', sales.count], ['Total sales', sales.total.toFixed(2)]];
  } else {
    const tasks = await db.all(
      `SELECT title, due_at, status FROM tasks
       WHERE status = 'pending' AND due_at >= ? AND due_at < ? ORDER BY due_at`,
      period.start,
      period.end
    );
    title = 'Weekly Pending Tasks';
    columns = ['Task', 'Due at (IST)', 'Status'];
    rows = tasks.map((task) => [task.title, task.due_at, task.status]);
  }

  await fs.mkdir(config.reportsDirectory, { recursive: true });
  const extension = schedule.format === 'pdf' ? 'pdf' : 'xlsx';
  const filePath = path.join(
    config.reportsDirectory,
    `schedule-${schedule.id}-${Date.now()}.${extension}`
  );
  const report = { title, period: period.label, columns, rows, filePath };

  if (schedule.format === 'pdf') {
    await writePdf(report);
  } else {
    await writeExcel(report);
  }
  return report;
}

function writePdf(report) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument();
    const output = fileSystem.createWriteStream(report.filePath);
    output.on('finish', resolve);
    output.on('error', reject);
    document.on('error', reject);
    document.pipe(output);
    document.fontSize(18).text(report.title);
    document.moveDown().fontSize(11).text(`Period: ${report.period}`);
    document.moveDown().text(report.columns.join(' | '));
    for (const row of report.rows) {
      document.text(row.join(' | '));
    }
    document.end();
  });
}

async function writeExcel(report) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Report');
  sheet.addRow([report.title]);
  sheet.addRow(['Period', report.period]);
  sheet.addRow(report.columns);
  for (const row of report.rows) {
    sheet.addRow(row);
  }
  await workbook.xlsx.writeFile(report.filePath);
}

async function sendReportEmail(schedule, report) {
  const result = await mailer.sendMail({
    from: config.smtp.user || 'reports@example.com',
    to: schedule.recipients.join(', '),
    subject: report.title,
    text: `Your ${report.title.toLowerCase()} report is attached.`,
    attachments: [{ path: report.filePath }]
  });
  if (usingEthereal) {
    console.info('Ethereal preview:', nodemailer.getTestMessageUrl(result));
  }
}

async function sendAdminEmail(runId, scheduleId, error) {
  await mailer.sendMail({
    from: config.smtp.user || 'reports@example.com',
    to: config.adminEmail,
    subject: `Report run ${runId} failed`,
    text: `Schedule ${scheduleId} failed: ${error}`
  });
}

export { startMailer, createReport, sendReportEmail, sendAdminEmail };
