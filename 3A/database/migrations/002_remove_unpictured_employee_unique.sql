-- The ER diagram does not make employee names unique within a department.
ALTER TABLE employees
DROP CONSTRAINT IF EXISTS employee_name_unique;
