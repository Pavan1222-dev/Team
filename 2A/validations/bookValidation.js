
const Joi = require("joi");

const bookSchema = Joi.object({
  title: Joi.string().trim().min(1).required(),
  author: Joi.string().trim().min(1).required(),
  isbn: Joi.string().trim().min(1).required(),
  category: Joi.string().trim().min(1).required(),
  total_copies: Joi.number().integer().min(0).required(),
  available_copies: Joi.number().integer().min(0).required()
}).custom((book, helpers) => {
  if (book.available_copies > book.total_copies) {
    return helpers.error("any.invalid", {
      message: "Available copies cannot exceed total copies"
    });
  }

  return book;
}).messages({
  "any.invalid": "Available copies cannot exceed total copies"
});

module.exports = { bookSchema };
