import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const config = {
  port: Number(process.env.PORT) || 3000,
  adminEmail: process.env.ADMIN_EMAIL || 'admin@example.com',
  timezone: 'Asia/Kolkata',
  databasePath: path.join(rootDirectory, 'data', 'scheduler.sqlite'),
  reportsDirectory: path.join(rootDirectory, 'reports', 'generated'),
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD
  }
};

export default config;
