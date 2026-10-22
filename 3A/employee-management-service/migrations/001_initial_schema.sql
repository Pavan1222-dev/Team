-- Core organization tables. UUIDs avoid leaking sequential identifiers in API URLs.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (length(trim(name)) > 0),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL CHECK (length(trim(first_name)) > 0),
  last_name text NOT NULL CHECK (length(trim(last_name)) > 0),
  email text NOT NULL UNIQUE CHECK (position('@' in email) > 1),
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  manager_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  job_title text,
  joining_date date NOT NULL,
  leave_balance integer NOT NULL DEFAULT 20 CHECK (leave_balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (manager_id IS NULL OR manager_id <> id)
);

CREATE TABLE leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  decided_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

-- These indexes support the common joins, filters, manager-chain walk, and approved leave lookup.
CREATE INDEX employees_name_search_idx ON employees (lower(last_name), lower(first_name));
CREATE INDEX employees_department_idx ON employees (department_id);
CREATE INDEX employees_joining_date_idx ON employees (joining_date);
CREATE INDEX employees_manager_idx ON employees (manager_id);
CREATE INDEX leave_employee_dates_idx ON leave_requests (employee_id, start_date, end_date);
CREATE INDEX leave_status_dates_idx ON leave_requests (status, start_date, end_date);
