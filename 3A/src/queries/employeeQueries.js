// SQL for employee operations, reports, search, and manager hierarchy.
const employeeQueries = {
  createEmployee: `
    INSERT INTO employees (name, department_id, manager_id, joining_date, leave_balance)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `,

  getAllEmployees: `
    SELECT e.*, d.name AS department_name, m.name AS manager_name
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN employees m ON m.id = e.manager_id
    ORDER BY e.id
  `,

  getEmployeeById: `
    SELECT e.*, d.name AS department_name, m.name AS manager_name
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN employees m ON m.id = e.manager_id
    WHERE e.id = $1
  `,

  searchEmployees: `
    SELECT e.*, d.name AS department_name, m.name AS manager_name
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN employees m ON m.id = e.manager_id
    WHERE ($1::varchar IS NULL OR e.name ILIKE '%' || $1 || '%')
      AND ($2::int IS NULL OR e.department_id = $2)
      AND ($3::date IS NULL OR e.joining_date >= $3)
      AND ($4::date IS NULL OR e.joining_date <= $4)
    ORDER BY e.id
  `,

  updateEmployee: `
    UPDATE employees
    SET name = $1, department_id = $2, manager_id = $3, joining_date = $4, leave_balance = $5
    WHERE id = $6
    RETURNING *
  `,

  deleteEmployee: `
    DELETE FROM employees
    WHERE id = $1
    RETURNING *
  `,

  getReportingHierarchy: `
    -- Walk from the selected employee to each manager, stopping at the top.
    WITH RECURSIVE hierarchy AS (
      SELECT e.id, e.name, e.manager_id, e.department_id, 1 AS level
      FROM employees e
      WHERE e.id = $1

      UNION ALL

      SELECT em.id, em.name, em.manager_id, em.department_id, h.level + 1
      FROM employees em
      INNER JOIN hierarchy h ON em.id = h.manager_id
    )
    SELECT * FROM hierarchy
    ORDER BY level
  `,

  getEmployeesOnLeaveToday: `
    SELECT e.*, d.name AS department_name
    FROM employees e
    INNER JOIN departments d ON d.id = e.department_id
    INNER JOIN leave_requests lr ON lr.employee_id = e.id
    WHERE lr.status = 'Approved'
      AND CURRENT_DATE BETWEEN lr.start_date AND lr.end_date
    ORDER BY e.id
  `,

  getHeadcountByDepartment: `
    SELECT d.name, COUNT(e.id) AS headcount
    FROM departments d
    LEFT JOIN employees e ON e.department_id = d.id
    GROUP BY d.id, d.name
    ORDER BY d.id
  `,

  getEmployeeManagers: `
    SELECT *
    FROM employees
    WHERE id = $1
  `
};

export default employeeQueries;
