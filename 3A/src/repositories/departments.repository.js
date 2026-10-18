const SORT_COLUMNS = Object.freeze({ name: 'name', createdAt: 'created_at' });

export function createDepartmentsRepository(database) {
  return {
    async create({ name, description }) {
      const result = await database.query(
        `INSERT INTO departments (name, description)
         VALUES ($1, $2) RETURNING id, name, description, created_at, updated_at`,
        [name, description ?? null],
      );
      return result.rows[0];
    },

    async list({ name, page, limit, offset, sortBy, order }) {
      const values = [];
      const where = name === undefined ? '' : (() => {
        values.push(`%${name}%`);
        return `WHERE name ILIKE $${values.length}`;
      })();
      const count = await database.query(`SELECT count(*)::int AS total FROM departments ${where}`, values);
      values.push(limit, offset);
      const rows = await database.query(
        `SELECT id, name, description, created_at, updated_at FROM departments ${where}
         ORDER BY ${SORT_COLUMNS[sortBy]} ${order.toUpperCase()}, id ASC
         LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      );
      return { rows: rows.rows, totalItems: count.rows[0].total, page, limit };
    },

    async getById(id) {
      const result = await database.query(
        'SELECT id, name, description, created_at, updated_at FROM departments WHERE id = $1',
        [id],
      );
      return result.rows[0] ?? null;
    },

    async update(id, fields) {
      const columns = { name: 'name', description: 'description' };
      const entries = Object.entries(fields);
      const assignments = entries.map(([key], index) => `${columns[key]} = $${index + 2}`);
      const values = [id, ...entries.map(([, value]) => value)];
      const result = await database.query(
        `UPDATE departments SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 RETURNING id, name, description, created_at, updated_at`,
        values,
      );
      return result.rows[0] ?? null;
    },

    async delete(id) {
      const client = await database.connect();
      let started = false;
      try {
        await client.query('BEGIN');
        started = true;
        const department = await client.query('SELECT id FROM departments WHERE id = $1 FOR UPDATE', [id]);
        if (department.rowCount === 0) {
          await client.query('ROLLBACK');
          started = false;
          return { missing: true };
        }
        const employee = await client.query('SELECT 1 FROM employees WHERE department_id = $1 LIMIT 1', [id]);
        if (employee.rowCount > 0) {
          await client.query('ROLLBACK');
          started = false;
          return { hasEmployees: true };
        }
        await client.query('DELETE FROM departments WHERE id = $1', [id]);
        await client.query('COMMIT');
        started = false;
        return { deleted: true };
      } catch (error) {
        if (started) await client.query('ROLLBACK').catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
