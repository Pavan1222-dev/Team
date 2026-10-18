import { errorResponse, successResponse } from '../utils/responses.js';

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
    getBook: async function getBook(request, response, next) {
      try {
        const book = await service.getBookById(request.bookId);
        if (!book) {
          response.status(404).json(errorResponse('Book not found.'));
          return;
        }

        response.json(successResponse(book));
      } catch (error) {
        next(error);
      }
    },
    updateBook: async function updateBook(request, response, next) {
      try {
        const book = await service.updateBook(request.bookId, request.body);
        if (!book) {
          response.status(404).json(errorResponse('Book not found.'));
          return;
        }

        response.json(successResponse(book));
      } catch (error) {
        next(error);
      }
    },
    deleteBook: async function deleteBook(request, response, next) {
      try {
        const deleted = await service.deleteBook(request.bookId);
        if (!deleted) {
          response.status(404).json(errorResponse('Book not found.'));
          return;
        }

        response.status(204).end();
      } catch (error) {
        next(error);
      }
    },
  };
}
