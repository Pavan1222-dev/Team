import Joi from 'joi';
import { errorResponse } from '../utils/responses.js';

const createBookSchema = Joi.object({
  title: Joi.string().trim().min(1).required(),
  author: Joi.string().trim().min(1).required(),
  isbn: Joi.string().trim().min(1).required(),
  category: Joi.string().trim().min(1).required(),
  totalCopies: Joi.number().integer().positive().required(),
});

const listBooksSchema = Joi.object({
  title: Joi.string().trim().min(1),
  author: Joi.string().trim().min(1),
  category: Joi.string().trim().min(1),
  page: Joi.number().integer().positive().default(1),
  limit: Joi.number().integer().positive().default(10),
  sortBy: Joi.string().valid('title', 'author', 'category', 'isbn').default('title'),
  order: Joi.string().lowercase().valid('asc', 'desc').default('asc'),
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

export function validateListBooks(request, response, next) {
  const { value, error } = listBooksSchema.validate(request.query, {
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

  request.validatedQuery = value;
  next();
}
