const express = require('express');
const { z } = require('zod');
const bookController = require('../controllers/bookController');
const validateBody = require('../middleware/validate');

const router = express.Router();
const bookSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  isbn: z.string().min(1, "ISBN is required"),
  category: z.string().min(1, "Category is required"),
  total_copies: z.number().int().positive("Must have at least 1 copy")
});
router.post('/', validateBody(bookSchema), bookController.createBook);
router.get('/', bookController.getBooks);
router.put('/:id', validateBody(bookSchema), bookController.updateBook);
router.delete('/:id', bookController.deleteBook);

module.exports = router;