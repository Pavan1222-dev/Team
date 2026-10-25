
const bookRepository = require("../data-access/bookRepository");


function getAllBooks(search, options) {
  return bookRepository.getAllBooks(search, options);
}


function getBookById(id) {
  return bookRepository.getBookById(id);
}

function createBook(book) {
  if (book.total_copies < 0 || book.available_copies < 0) {
    throw new Error("Copy counts cannot be negative");
  }

  if (book.available_copies > book.total_copies) {
    throw new Error(
      "Available copies cannot exceed total copies"
    );
  }

  return bookRepository.createBook(book);
}

function updateBook(id, book) {
  if (book.total_copies < 0 || book.available_copies < 0) {
    throw new Error("Copy counts cannot be negative");
  }

  if (book.available_copies > book.total_copies) {
    throw new Error(
      "Available copies cannot exceed total copies"
    );
  }

  return bookRepository.updateBook(id, book);
}

function deleteBook(id) {
  return bookRepository.deleteBook(id);
}

module.exports = {
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook
};
