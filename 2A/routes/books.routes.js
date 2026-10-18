import { Router } from 'express';
import { createBooksController } from '../controllers/books.controller.js';
import { createBooksRepository } from '../repositories/books.repository.js';
import { createBooksService } from '../services/books.service.js';
import { validateCreateBook } from '../validators/books.validator.js';

export function createBooksRouter(database) {
  const router = Router();
  const repository = createBooksRepository(database);
  const service = createBooksService(repository);
  const controller = createBooksController(service);

  router.post('/books', validateCreateBook, controller);

  return router;
}
