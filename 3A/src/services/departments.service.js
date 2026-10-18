import { HttpError } from '../middleware/error-handler.js';

function toDepartment(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createDepartmentsService(repository) {
  return {
    async create(fields) {
      return toDepartment(await repository.create(fields));
    },
    async list(query) {
      const result = await repository.list(query);
      return {
        items: result.rows.map(toDepartment),
        pagination: {
          page: result.page,
          limit: result.limit,
          totalItems: result.totalItems,
          totalPages: Math.ceil(result.totalItems / result.limit),
        },
      };
    },
    async get(id) {
      const department = await repository.getById(id);
      if (!department) throw new HttpError(404, 'Department not found.');
      return toDepartment(department);
    },
    async update(id, fields) {
      const department = await repository.update(id, fields);
      if (!department) throw new HttpError(404, 'Department not found.');
      return toDepartment(department);
    },
    async delete(id) {
      const result = await repository.delete(id);
      if (result.missing) throw new HttpError(404, 'Department not found.');
      if (result.hasEmployees) throw new HttpError(409, 'Department cannot be deleted while employees belong to it.');
    },
  };
}
