import * as bookData from "../data_access/bookData.js";

// Turn a business-rule error into an HTTP error for the central handler.
class ServiceError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// List books using optional search, page, limit and sort values.
async function listBooks(query) {
  const result = await bookData.listBooks({
    filters: { title: query.title, author: query.author, category: query.category },
    sortBy: query.sortBy === "totalCopies" ? "total_copies"
      : query.sortBy === "availableCopies" ? "available_copies" : query.sortBy,
    order: query.order.toUpperCase(),
    limit: query.limit,
    offset: (query.page - 1) * query.limit
  });

  return {
    items: result.items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      pages: Math.ceil(result.total / query.limit)
    }
  };
}

// Find one book or return a 404 error.
async function getBook(id) {
  const book = await bookData.findBookById(id);
  if (!book) throw new ServiceError(404, "BOOK_NOT_FOUND", "Book not found.");
  return book;
}

// Check the ISBN, then save the new book.
async function createBook(input) {
  if (await bookData.findBookByIsbn(input.isbn)) {
    throw new ServiceError(409, "DUPLICATE_ISBN", "A book with this ISBN already exists.");
  }
  return bookData.createBook({
    ...input,
    availableCopies: input.availableCopies === undefined ? input.totalCopies : input.availableCopies
  });
}

// Update an existing book but keep the number of borrowed copies valid.
async function updateBook(id, input) {
  const current = await getBook(id);
  const updated = await bookData.findBookByIsbn(input.isbn);
  if (updated && updated.id !== id) {
    throw new ServiceError(409, "DUPLICATE_ISBN", "A book with this ISBN already exists.");
  }

  const book = await bookData.updateBook(id, input);
  if (book) return book;
  if (!(await bookData.findBookById(id))) {
    throw new ServiceError(404, "BOOK_NOT_FOUND", "Book not found.");
  }
  throw new ServiceError(409, "COPIES_ON_LOAN", `Book copy counts cannot be reduced below the ${current.totalCopies - current.availableCopies} copies currently on loan.`);
}

// Delete a book if it exists and has no loan history.
async function deleteBook(id) {
  if (!(await bookData.deleteBook(id))) {
    throw new ServiceError(404, "BOOK_NOT_FOUND", "Book not found.");
  }
}

export { createBook, deleteBook, getBook, listBooks, updateBook };
