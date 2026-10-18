import { HttpError } from '../middleware/error-handler.js';

function toEmployee(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    departmentId: row.department_id,
    departmentName: row.department_name,
    managerId: row.manager_id,
    joiningDate: row.joining_date,
    leaveBalanceDays: row.leave_balance_days,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createEmployeesService(repository) {
  async function validateReferences(fields, employeeId) {
    if (fields.departmentId !== undefined && !(await repository.departmentExists(fields.departmentId))) {
      throw new HttpError(404, 'Department not found.');
    }
    if (fields.managerId !== undefined && fields.managerId !== null) {
      if (employeeId !== undefined && String(fields.managerId) === String(employeeId)) {
        throw new HttpError(400, 'An employee cannot be their own manager.');
      }
      if (!(await repository.employeeExists(fields.managerId))) throw new HttpError(404, 'Manager not found.');
    }
  }

  return {
    async create(fields) {
      await validateReferences(fields);
      return toEmployee(await repository.create(fields));
    },
    async list(query) {
      const result = await repository.list(query);
      return {
        items: result.rows.map(toEmployee),
        pagination: {
          page: result.page,
          limit: result.limit,
          totalItems: result.totalItems,
          totalPages: Math.ceil(result.totalItems / result.limit),
        },
      };
    },
    async get(id) {
      const employee = await repository.getById(id);
      if (!employee) throw new HttpError(404, 'Employee not found.');
      return toEmployee(employee);
    },
    async update(id, fields) {
      if (!(await repository.employeeExists(id))) throw new HttpError(404, 'Employee not found.');
      await validateReferences(fields, id);
      const employee = await repository.update(id, fields);
      if (!employee) throw new HttpError(404, 'Employee not found.');
      return toEmployee(employee);
    },
    async delete(id) {
      try {
        if (!(await repository.delete(id))) throw new HttpError(404, 'Employee not found.');
      } catch (error) {
        if (error.code === '23503' || error.code === '23001') {
          throw new HttpError(409, 'Employee cannot be deleted while leave history references them.');
        }
        throw error;
      }
    },
  };
}
