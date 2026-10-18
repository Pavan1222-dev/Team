const SORT_COLUMNS = Object.freeze({
  firstName: 'e.first_name',
  lastName: 'e.last_name',
  email: 'e.email',
  departmentName: 'd.name',
  joiningDate: 'e.joining_date',
  createdAt: 'e.created_at',
});

const EMPLOYEE_SELECT = `e.id, e.first_name, e.last_name, e.email, e.department_id,
  e.manager_id, e.joining_date::text AS joining_date, e.leave_balance_days,
  e.created_at, e.updated_at, d.name AS department_name`;

function buildFilters(query) {
  const values = [];
  const clauses = [];
  const add = (clause, value) => {
    values.push(value);
    clauses.push(clause.replace('?', `$${values.length}`));
  };

  if (query.name !== undefined) {
    const pattern = `%${query.name}%`;
    values.push(pattern);
    const parameter = `$${values.length}`;
    clauses.push(`(e.first_name ILIKE ${parameter} OR e.last_name ILIKE ${parameter}
      OR concat_ws(' ', e.first_name, e.last_name) ILIKE ${parameter})`);
  }
  if (query.department !== undefined) add('d.name ILIKE ?', `%${query.department}%`);
  if (query.departmentId !== undefined) add('e.department_id = ?', query.departmentId);
  if (query.joiningDateFrom !== undefined) add('e.joining_date >= ?::date', query.joiningDateFrom);
  if (query.joiningDateTo !== undefined) add('e.joining_date <= ?::date', query.joiningDateTo);
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', values };
}

export function createEmployeesRepository(database) {
  const getById = async (id) => {
    const result = await database.query(
      `SELECT ${EMPLOYEE_SELECT} FROM employees e JOIN departments d ON d.id = e.department_id WHERE e.id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  };

  return {
    departmentExists: async (id) => {
      const result = await database.query('SELECT 1 FROM departments WHERE id = $1', [id]);
      return result.rowCount > 0;
    },
    employeeExists: async (id) => {
      const result = await database.query('SELECT 1 FROM employees WHERE id = $1', [id]);
      return result.rowCount > 0;
    },
    create: async ({ firstName, lastName, email, departmentId, managerId, joiningDate }) => {
      const result = await database.query(
        `INSERT INTO employees (first_name, last_name, email, department_id, manager_id, joining_date)
         VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE)) RETURNING id`,
        [firstName, lastName, email, departmentId, managerId ?? null, joiningDate ?? null],
      );
      return getById(result.rows[0].id);
    },
    list: async (query) => {
      const { where, values } = buildFilters(query);
      const count = await database.query(
        `SELECT count(*)::int AS total FROM employees e JOIN departments d ON d.id = e.department_id ${where}`,
        values,
      );
      const listValues = [...values, query.limit, query.offset];
      const rows = await database.query(
        `SELECT ${EMPLOYEE_SELECT} FROM employees e JOIN departments d ON d.id = e.department_id ${where}
         ORDER BY ${SORT_COLUMNS[query.sortBy]} ${query.order.toUpperCase()}, e.id ASC
         LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
        listValues,
      );
      return { rows: rows.rows, totalItems: count.rows[0].total, page: query.page, limit: query.limit };
    },
    getById,
    update: async (id, fields) => {
      const columns = {
        firstName: 'first_name',
        lastName: 'last_name',
        email: 'email',
        departmentId: 'department_id',
        managerId: 'manager_id',
        joiningDate: 'joining_date',
      };
      const entries = Object.entries(fields);
      const assignments = entries.map(([key], index) => `${columns[key]} = $${index + 2}${key === 'joiningDate' ? '::date' : ''}`);
      const values = [id, ...entries.map(([, value]) => value)];
      const result = await database.query(
        `UPDATE employees SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 RETURNING id`,
        values,
      );
      return result.rowCount === 0 ? null : getById(result.rows[0].id);
    },
    delete: async (id) => {
      const result = await database.query('DELETE FROM employees WHERE id = $1 RETURNING id', [id]);
      return result.rowCount > 0;
    },
  };
}
