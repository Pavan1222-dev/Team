import { HttpError } from '../middleware/error-handler.js';
import {
  optionalText,
  pagination,
  positiveId,
  rejectUnknownKeys,
  requiredText,
  requireObject,
  sorting,
  validateWith,
} from './shared.js';

const departmentFields = ['name', 'description'];

function validateBody(body, partial) {
  const input = requireObject(body, 'Request body');
  rejectUnknownKeys(input, departmentFields, 'department');
  const result = {};
  if (Object.hasOwn(input, 'name')) result.name = requiredText(input.name, 'name', 120);
  if (Object.hasOwn(input, 'description')) {
    result.description = optionalText(input.description, 'description', undefined, { nullable: true });
  }
  if (!partial && !Object.hasOwn(result, 'name')) throw new HttpError(400, 'name is required.');
  if (partial && Object.keys(result).length === 0) throw new HttpError(400, 'At least one department field must be supplied.');
  return result;
}

export const validateCreateDepartment = validateWith((request) => validateBody(request.body, false));
export const validateUpdateDepartment = validateWith((request) => ({
  id: positiveId(request.params.id, 'id'),
  fields: validateBody(request.body, true),
}));
export const validateDepartmentId = validateWith((request) => ({ id: positiveId(request.params.id, 'id') }));
export const validateListDepartments = validateWith((request) => {
  const page = pagination(request.query);
  const sort = sorting(request.query, ['name', 'createdAt'], 'name');
  const name = request.query.name === undefined ? undefined : requiredText(request.query.name, 'name');
  return { ...page, ...sort, name };
});
