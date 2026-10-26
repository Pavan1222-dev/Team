import dotenv from 'dotenv';

// Load environment variables from .env file if it exists.
dotenv.config();

// Keep server and PostgreSQL settings in one place for easy local configuration.
const env = {
  port: Number(process.env.PORT || 3000),
  pgHost: process.env.PGHOST || 'localhost',
  pgPort: Number(process.env.PGPORT || 5432),
  pgUser: process.env.PGUSER || 'postgres',
  pgPassword: process.env.PGPASSWORD || '',
  pgDatabase: process.env.PGDATABASE || 'employee_leave_db'
};

export default env;
