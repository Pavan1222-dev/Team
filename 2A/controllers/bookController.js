import * as bookService from "../services/bookService.js";

// Controllers connect a route to the service and return an HTTP response.
// Read all books for the requested page.
async function listBooks(request, response) {
  const data = await bookService.listBooks(response.locals.validated.query);
  response.status(200).json({ success: true, data, error: null });
}

// Read one book.
async function getBook(request, response) {
  const { id } = response.locals.validated.params;
  const data = await bookService.getBook(id);
  response.status(200).json({ success: true, data, error: null });
}

// Save a new book and respond with 201 Created.
async function createBook(request, response) {
  const data = await bookService.createBook(response.locals.validated.body);
  response.status(201).json({ success: true, data, error: null });
}

// Save changes to an existing book.
async function updateBook(request, response) {
  const { id } = response.locals.validated.params;
  const data = await bookService.updateBook(id, response.locals.validated.body);
  response.status(200).json({ success: true, data, error: null });
}

// Delete a book and respond with 204 No Content.
async function deleteBook(request, response) {
  const { id } = response.locals.validated.params;
  await bookService.deleteBook(id);
  response.status(204).end();
}

export { createBook, deleteBook, getBook, listBooks, updateBook };
