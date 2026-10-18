const SORT_COLUMNS = Object.freeze({
  startDate: 'lr.start_date',
  endDate: 'lr.end_date',
  createdAt: 'lr.created_at',
  status: 'lr.status',
});

const SELECT_FIELDS = `lr.id, lr.employee_id, lr.start_date::text AS start_date,
  lr.end_date::text AS end_date, (lr.end_date - lr.start_date + 1)::integer AS duration_days,
  lr.reason, lr.status, lr.reviewer_id, lr.reviewed_at, lr.created_at, lr.updated_at`;

function buildFilters(filters) {
  const values = [];
  const clauses = [];
  const add = (column, value, cast = '') => {
    values.push(value);
    clauses.push(`${column} = $${values.length}${cast}`);
  };
  if (filters.employeeId !== undefined) add('lr.employee_id', filters.employeeId);
  if (filters.status !== undefined) add('lr.status', filters.status);
  if (filters.startDateFrom !== undefined) {
    values.push(filters.startDateFrom);
    clauses.push(`lr.start_date >= $${values.length}::date`);
  }
  if (filters.startDateTo !== undefined) {
    values.push(filters.startDateTo);
    clauses.push(`lr.start_date <= $${values.length}::date`);
  }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', values };
}

export function createLeaveRequestsRepository(database) {
  return {
    async getById(id) {
      const result = await database.query(
        `SELECT ${SELECT_FIELDS} FROM leave_requests lr WHERE lr.id = $1`,
        [id],
      );
      return result.rows[0] ?? null;
    },
    async list(filters) {
      const { where, values } = buildFilters(filters);
      const count = await database.query(
        `SELECT count(*)::int AS total FROM leave_requests lr ${where}`,
        values,
      );
      const listValues = [...values, filters.limit, filters.offset];
      const rows = await database.query(
        `SELECT ${SELECT_FIELDS} FROM leave_requests lr ${where}
         ORDER BY ${SORT_COLUMNS[filters.sortBy]} ${filters.order.toUpperCase()}, lr.id ASC
         LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
        listValues,
      );
      return {
        rows: rows.rows,
        page: filters.page,
        limit: filters.limit,
        totalItems: count.rows[0].total,
      };
    },
  };
}
