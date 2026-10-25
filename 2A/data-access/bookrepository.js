
const db = require("../database/db");


function getAllBooks(search, options) {
  const {
    page,
    limit,
    sortBy,
    order
  } = options;

  const allowedSortFields = [
    "id",
    "title",
    "author",
    "category",
    "total_copies",
    "available_copies"
  ];

  // Only allow known column names in the SQL query.
  const safeSortBy = allowedSortFields.includes(sortBy)
    ? sortBy
    : "id";

  const safeOrder = order === "desc" ? "DESC" : "ASC";

  const where = search
    ? `WHERE title LIKE ? OR author LIKE ? OR category LIKE ?`
    : "";

  const searchParams = search
    ? [`%${search}%`, `%${search}%`, `%${search}%`]
    : [];

  const data = db.prepare(`
    SELECT * FROM books
    ${where}
    ORDER BY ${safeSortBy} ${safeOrder}
    LIMIT ? OFFSET ?
  `).all(
    ...searchParams,
    limit,
    (page - 1) * limit
  );

  const total = db.prepare(`
    SELECT COUNT(*) AS count
    FROM books
    ${where}
  `).get(...searchParams).count;

  return {
    data,
    total
  };
}


function getBookById(id) {
  return db.prepare(
    "SELECT * FROM books WHERE id = ?"
  ).get(id);
}

function createBook(book) {
  const result = db.prepare(`
    INSERT INTO books
    (title, author, isbn, category, total_copies, available_copies)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    book.title,
    book.author,
    book.isbn,
    book.category,
    book.total_copies,
    book.available_copies
  );

  return getBookById(result.lastInsertRowid);
}

function updateBook(id, book) {
  db.prepare(`
    UPDATE books
    SET title = ?, author = ?, isbn = ?, category = ?,
        total_copies = ?, available_copies = ?
    WHERE id = ?
  `).run(
    book.title,
    book.author,
    book.isbn,
    book.category,
    book.total_copies,
    book.available_copies,
    id
  );

  return getBookById(id);
}

function deleteBook(id) {
  return db.prepare(
    "DELETE FROM books WHERE id = ?"
  ).run(id);
}

module.exports = {
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook
};
