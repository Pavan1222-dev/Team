import { all, get, run } from "./dbConnection.js";

// Select book fields and give database names readable JavaScript names.
const BOOK_SELECT = `
  SELECT id, title, author, isbn, category,
         total_copies AS totalCopies,
         available_copies AS availableCopies
  FROM books
`;

// Search books, then return only the requested page.
async function listBooks({ filters, sortBy, order, limit, offset }) {
  const where = [];
  const parameters = [];

  for (const field of ['title', 'author', 'category']) {
    if (filters[field]) {
      where.push(`${field} LIKE ? COLLATE NOCASE`);
      parameters.push(`%${filters[field]}%`);
    }
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const countRow = await get(`SELECT COUNT(*) AS total FROM books ${clause}`, parameters);
  const rows = await all(
    `${BOOK_SELECT} ${clause} ORDER BY ${sortBy} ${order}, id ASC LIMIT ? OFFSET ?`,
    [...parameters, limit, offset]
  );

  return { items: rows, total: countRow.total };
}

// Find a book by id or ISBN.
function findBookById(id) {
  return get(`${BOOK_SELECT} WHERE id = ?`, [id]);
}

function findBookByIsbn(isbn) {
  return get(`${BOOK_SELECT} WHERE isbn = ?`, [isbn]);
}

async function createBook(book) {
  const result = await run(
    `INSERT INTO books (title, author, isbn, category, total_copies, available_copies)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [book.title, book.author, book.isbn, book.category, book.totalCopies, book.availableCopies]
  );
  return findBookById(result.lastID);
}

// Keep borrowed copies unchanged when book details are edited.
async function updateBook(id, book) {
  const result = await run(
    `UPDATE books
     SET title = ?, author = ?, isbn = ?, category = ?, total_copies = ?, available_copies = ?
     WHERE id = ? AND (? - ? >= total_copies - available_copies)`,
    [
      book.title,
      book.author,
      book.isbn,
      book.category,
      book.totalCopies,
      book.availableCopies,
      id,
      book.totalCopies,
      book.availableCopies
    ]
  );
  return result.changes ? findBookById(id) : null;
}

// Delete a book and let SQLite reject it if a loan refers to it.
async function deleteBook(id) {
  const result = await run('DELETE FROM books WHERE id = ?', [id]);
  return result.changes > 0;
}

export { createBook, deleteBook, findBookById, findBookByIsbn, listBooks, updateBook };