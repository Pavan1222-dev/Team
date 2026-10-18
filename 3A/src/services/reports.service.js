import { HttpError } from '../middleware/error-handler.js';

function mapEmployee(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    departmentId: row.department_id,
    departmentName: row.department_name,
    managerId: row.manager_id,
    joiningDate: row.joining_date,
  };
}

export function createReportsService(repository) {
  return {
    async departmentHeadcount() {
      const rows = await repository.departmentHeadcount();
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        employeeCount: Number(row.employee_count),
      }));
    },

    async employeesOnLeaveToday() {
      const rows = await repository.employeesOnLeaveToday();
      return rows.map((row) => ({
        ...mapEmployee(row),
        leave: {
          startDate: row.leave_start_date,
          endDate: row.leave_end_date,
          reason: row.leave_reason,
        },
      }));
    },

    async managerHierarchy(employeeId) {
      const rows = await repository.managerHierarchy(employeeId);
      if (rows.length === 0) throw new HttpError(404, 'Employee not found.');
      return rows.map((row) => ({ ...mapEmployee(row), level: Number(row.level) }));
    },
  };
}
