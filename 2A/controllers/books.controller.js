import { successResponse } from '../utils/responses.js';

export function createBooksController(service) {
  return async function createBook(request, response, next) {
    try {
      const book = await service.createBook(request.body);
      response.status(201).json(successResponse(book));
    } catch (error) {
      next(error);
    }
  };
}
