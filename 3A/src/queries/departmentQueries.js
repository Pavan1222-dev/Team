// SQL for department operations. Values are passed separately as $1, $2, etc.
const departmentQueries = {
  createDepartment: `
    INSERT INTO departments (name)
    VALUES ($1)
    RETURNING *
  `,

  getAllDepartments: `
    SELECT *
    FROM departments
    ORDER BY id
  `,

  getDepartmentById: `
    SELECT *
    FROM departments
    WHERE id = $1
  `,

  updateDepartment: `
    UPDATE departments
    SET name = $1
    WHERE id = $2
    RETURNING *
  `,

  deleteDepartment: `
    DELETE FROM departments
    WHERE id = $1
    RETURNING *
  `,

  countEmployeesInDepartment: `
    SELECT COUNT(*) AS total
    FROM employees
    WHERE department_id = $1
  `
};

export default departmentQueries;
