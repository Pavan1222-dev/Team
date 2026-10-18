const EMPLOYEE_FIELDS = `e.id, e.first_name, e.last_name, e.email,
  e.department_id, d.name AS department_name, e.manager_id, e.joining_date::text AS joining_date`;

export function createReportsRepository(database) {
  return {
    async departmentHeadcount() {
      const result = await database.query(
        `SELECT d.id, d.name, d.description, COUNT(e.id)::integer AS employee_count
         FROM departments d
         LEFT JOIN employees e ON e.department_id = d.id
         GROUP BY d.id
         ORDER BY d.name ASC, d.id ASC`,
      );
      return result.rows;
    },

    async employeesOnLeaveToday() {
      const result = await database.query(
        `SELECT ${EMPLOYEE_FIELDS}, lr.start_date::text AS leave_start_date,
                lr.end_date::text AS leave_end_date, lr.reason AS leave_reason
         FROM employees e
         JOIN departments d ON d.id = e.department_id
         JOIN leave_requests lr ON lr.employee_id = e.id
         WHERE lr.status = 'APPROVED'
           AND lr.start_date <= CURRENT_DATE
           AND lr.end_date >= CURRENT_DATE
         ORDER BY e.last_name ASC, e.first_name ASC, e.id ASC`,
      );
      return result.rows;
    },

    async managerHierarchy(employeeId) {
      const result = await database.query(
        `WITH RECURSIVE manager_chain AS (
           SELECT ${EMPLOYEE_FIELDS}, 0 AS level, ARRAY[e.id] AS visited_ids
           FROM employees e
           JOIN departments d ON d.id = e.department_id
           WHERE e.id = $1
           UNION ALL
           SELECT ${EMPLOYEE_FIELDS.replaceAll('e.', 'manager.')},
                  chain.level + 1, chain.visited_ids || manager.id
           FROM manager_chain chain
           JOIN employees manager ON manager.id = chain.manager_id
           JOIN departments d ON d.id = manager.department_id
           WHERE NOT manager.id = ANY(chain.visited_ids)
         )
         SELECT id, first_name, last_name, email, department_id, department_name,
                manager_id, joining_date, level
         FROM manager_chain
         ORDER BY level ASC`,
        [employeeId],
      );
      return result.rows;
    },
  };
}
