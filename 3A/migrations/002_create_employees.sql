CREATE TABLE employees (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL CHECK (length(trim(first_name)) > 0),
  last_name VARCHAR(100) NOT NULL CHECK (length(trim(last_name)) > 0),
  email VARCHAR(320) NOT NULL UNIQUE CHECK (length(trim(email)) > 0),
  department_id BIGINT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  manager_id BIGINT REFERENCES employees(id) ON DELETE SET NULL,
  joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  leave_balance_days NUMERIC(6, 2) NOT NULL DEFAULT 20.00 CHECK (leave_balance_days >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT employees_cannot_manage_themselves CHECK (manager_id IS NULL OR manager_id <> id)
);

CREATE INDEX employees_department_id_idx ON employees (department_id);
CREATE INDEX employees_joining_date_idx ON employees (joining_date);
CREATE INDEX employees_name_search_idx ON employees (last_name, first_name);
CREATE INDEX employees_manager_id_idx ON employees (manager_id);
