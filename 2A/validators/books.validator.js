import Joi from 'joi';
import { errorResponse } from '../utils/responses.js';

const createBookSchema = Joi.object({
  title: Joi.string().trim().min(1).required(),
  author: Joi.string().trim().min(1).required(),
  isbn: Joi.string().trim().min(1).required(),
  category: Joi.string().trim().min(1).required(),
  totalCopies: Joi.number().integer().positive().required(),
});

export function validateCreateBook(request, response, next) {
  const { value, error } = createBookSchema.validate(request.body, {
    abortEarly: false,
    convert: true,
  });

  if (error) {
    const details = error.details.map(({ path, message }) => ({
      field: path.join('.'),
      message,
    }));
    response.status(400).json(errorResponse('Request validation failed.', details));
    return;
  }

  request.body = value;
  next();
}
