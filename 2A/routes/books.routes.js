import { Router } from 'express';
import { createBooksController } from '../controllers/books.controller.js';
import { createBooksRepository } from '../repositories/books.repository.js';
import { createBooksService } from '../services/books.service.js';
import {
  validateBookId,
  validateCreateBook,
  validateListBooks,
  validateUpdateBook,
} from '../validators/books.validator.js';

export function createBooksRouter(database) {
  const router = Router();
  const repository = createBooksRepository(database);
  const service = createBooksService(repository);
  const controller = createBooksController(service);

  router.get('/books', validateListBooks, controller.listBooks);
  router.get('/books/:id', validateBookId, controller.getBook);
  router.post('/books', validateCreateBook, controller.createBook);
  router.put('/books/:id', validateBookId, validateUpdateBook, controller.updateBook);
  router.delete('/books/:id', validateBookId, controller.deleteBook);

  return router;
}
