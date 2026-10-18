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

const bookIdSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const updateBookSchema = Joi.object({
  title: Joi.string().trim().min(1),
  author: Joi.string().trim().min(1),
  isbn: Joi.string().trim().min(1),
  category: Joi.string().trim().min(1),
  totalCopies: Joi.number().integer().positive(),
}).min(1);

function sendValidationError(response, error) {
  const details = error.details.map(({ path, message }) => ({
    field: path.join('.'),
    message,
  }));
  response.status(400).json(errorResponse('Request validation failed.', details));
}

export function validateCreateBook(request, response, next) {
  const { value, error } = createBookSchema.validate(request.body, {
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

export function validateListBooks(request, response, next) {
  const { value, error } = listBooksSchema.validate(request.query, {
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

export function validateBookId(request, response, next) {
  const { value, error } = bookIdSchema.validate(request.params, { convert: true });

  if (error) {
    sendValidationError(response, error);
    return;
  }

  request.bookId = value.id;
  next();
}

export function validateUpdateBook(request, response, next) {
  const { value, error } = updateBookSchema.validate(request.body, {
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
