import express from "express";
import * as bookController from "../controllers/bookController.js";
import { validate } from "../middlewares/validationMiddleware.js";
import {
  bookQuerySchema,
  createBookSchema,
  idParamsSchema,
  updateBookSchema
} from "../validations/schemas.js";

// Each URL calls a controller after validating its input.
const router = express.Router();
router.get('/', validate(bookQuerySchema, 'query'), bookController.listBooks);
router.post('/', validate(createBookSchema), bookController.createBook);
router.get('/:id', validate(idParamsSchema, 'params'), bookController.getBook);
router.put(
  '/:id',
  validate(idParamsSchema, 'params'),
  validate(updateBookSchema),
  bookController.updateBook
);
router.delete('/:id', validate(idParamsSchema, 'params'), bookController.deleteBook);
export default router;