import { successResponse } from '../utils/responses.js';

export function createBooksController(service) {
  return {
    createBook: async function createBook(request, response, next) {
      try {
        const book = await service.createBook(request.body);
        response.status(201).json(successResponse(book));
      } catch (error) {
        next(error);
      }
    },
    listBooks: async function listBooks(request, response, next) {
      try {
        const { books, totalItems } = await service.listBooks(request.validatedQuery);
        const { page, limit } = request.validatedQuery;
        response.json(successResponse({
          books,
          pagination: {
            page,
            limit,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
          },
        }));
      } catch (error) {
        next(error);
      }
    },
  };
}
