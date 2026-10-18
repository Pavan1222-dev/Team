import { HttpError } from '../middleware/error-handler.js';
import {
  optionalDate,
  pagination,
  positiveId,
  rejectUnknownKeys,
  requiredText,
  requireObject,
  sorting,
  validateWith,
} from './shared.js';

const employeeFields = ['firstName', 'lastName', 'email', 'departmentId', 'managerId', 'joiningDate'];
const employeeSortFields = ['firstName', 'lastName', 'email', 'departmentName', 'joiningDate', 'createdAt'];

function emailAddress(value) {
  const email = requiredText(value, 'email', 320).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'email must be a valid email address.');
  return email;
}

function employeeBody(body, partial) {
  const input = requireObject(body, 'Request body');
  rejectUnknownKeys(input, employeeFields, 'employee');
  const fields = {};
  if (Object.hasOwn(input, 'firstName')) fields.firstName = requiredText(input.firstName, 'firstName', 100);
  if (Object.hasOwn(input, 'lastName')) fields.lastName = requiredText(input.lastName, 'lastName', 100);
  if (Object.hasOwn(input, 'email')) fields.email = emailAddress(input.email);
  if (Object.hasOwn(input, 'departmentId')) fields.departmentId = positiveId(input.departmentId, 'departmentId');
  if (Object.hasOwn(input, 'managerId')) {
    fields.managerId = input.managerId === null ? null : positiveId(input.managerId, 'managerId');
  }
  if (Object.hasOwn(input, 'joiningDate')) {
    fields.joiningDate = optionalDate(input.joiningDate, 'joiningDate');
    if (fields.joiningDate === null) throw new HttpError(400, 'joiningDate cannot be null.');
  }
  if (!partial) {
    for (const required of ['firstName', 'lastName', 'email', 'departmentId']) {
      if (!Object.hasOwn(fields, required)) throw new HttpError(400, `${required} is required.`);
    }
  } else if (Object.keys(fields).length === 0) {
    throw new HttpError(400, 'At least one employee field must be supplied.');
  }
  return fields;
}

export const validateCreateEmployee = validateWith((request) => employeeBody(request.body, false));
export const validateUpdateEmployee = validateWith((request) => ({
  id: positiveId(request.params.id, 'id'),
  fields: employeeBody(request.body, true),
}));
export const validateEmployeeId = validateWith((request) => ({ id: positiveId(request.params.id, 'id') }));
export const validateListEmployees = validateWith((request) => {
  const page = pagination(request.query);
  const sort = sorting(request.query, employeeSortFields, 'lastName');
  const name = request.query.name === undefined ? undefined : requiredText(request.query.name, 'name');
  const department = request.query.department === undefined
    ? undefined
    : requiredText(request.query.department, 'department');
  const departmentId = request.query.departmentId === undefined
    ? undefined
    : positiveId(request.query.departmentId, 'departmentId');
  const joiningDateFrom = optionalDate(request.query.joiningDateFrom, 'joiningDateFrom');
  const joiningDateTo = optionalDate(request.query.joiningDateTo, 'joiningDateTo');
  if (joiningDateFrom && joiningDateTo && joiningDateFrom > joiningDateTo) {
    throw new HttpError(400, 'joiningDateFrom must be on or before joiningDateTo.');
  }
  return { ...page, ...sort, name, department, departmentId, joiningDateFrom, joiningDateTo };
});
