import Joi from 'joi';
import { errorResponse } from '../utils/responses.js';

const memberIdSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const memberFields = {
  name: Joi.string().trim().min(1),
  email: Joi.string().trim().email(),
  phone: Joi.string().trim().min(1),
  membershipType: Joi.string().trim().min(1),
};

const createMemberSchema = Joi.object(Object.fromEntries(
  Object.entries(memberFields).map(([field, schema]) => [field, schema.required()]),
));

const updateMemberSchema = Joi.object(memberFields).min(1);

const listMembersSchema = Joi.object({
  page: Joi.number().integer().positive().default(1),
  limit: Joi.number().integer().positive().default(10),
  sortBy: Joi.string().valid('name', 'email', 'phone', 'membershipType').default('name'),
  order: Joi.string().lowercase().valid('asc', 'desc').default('asc'),
});

function sendValidationError(response, error) {
  const details = error.details.map(({ path, message }) => ({
    field: path.join('.'),
    message,
  }));
  response.status(400).json(errorResponse('Request validation failed.', details));
}

export function validateMemberId(request, response, next) {
  const { value, error } = memberIdSchema.validate(request.params, { convert: true });
  if (error) {
    sendValidationError(response, error);
    return;
  }

  request.memberId = value.id;
  next();
}

export function validateCreateMember(request, response, next) {
  const { value, error } = createMemberSchema.validate(request.body, {
    abortEarly: false,
    convert: true,
  });
  if (error) {
    sendValidationError(response, error);
    return;
  }

  request.body = value;
  next();
}

export function validateUpdateMember(request, response, next) {
  const { value, error } = updateMemberSchema.validate(request.body, {
    abortEarly: false,
    convert: true,
  });
  if (error) {
    sendValidationError(response, error);
    return;
  }

  request.body = value;
  next();
}

export function validateListMembers(request, response, next) {
  const { value, error } = listMembersSchema.validate(request.query, {
    abortEarly: false,
    convert: true,
  });
  if (error) {
    sendValidationError(response, error);
    return;
  }

  request.validatedQuery = value;
  next();
}
