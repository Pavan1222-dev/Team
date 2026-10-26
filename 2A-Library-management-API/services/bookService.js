const db = require('../data-access/db');
async function createBook(data) {
  const existing = await db.getOne('SELECT * FROM books WHERE isbn = ?', [data.isbn]);
  if (existing) {
    let err = new Error('A book with this ISBN already exists.');
    err.status = 409;
    throw err;
  }

  let sql = 'INSERT INTO books (title, author, isbn, category, total_copies, available_copies) VALUES (?, ?, ?, ?, ?, ?)';
  await db.runQuery(sql, [data.title, data.author, data.isbn, data.category, data.total_copies, data.total_copies]);
  return { message: "Book created successfully" };
}
async function getBooks(page = 1, limit = 10, search = "") {
  let offset = (page - 1) * limit;
  if (search) {
    let term = `%${search}%`;
    let sql = 'SELECT * FROM books WHERE title LIKE ? OR author LIKE ? OR category LIKE ? LIMIT ? OFFSET ?';
    return await db.getAll(sql, [term, term, term, limit, offset]);
  }

  return await db.getAll('SELECT * FROM books LIMIT ? OFFSET ?', [limit, offset]);
}
async function updateBook(id, data) {
  let sql = 'UPDATE books SET title = ?, author = ?, category = ?, total_copies = ? WHERE id = ?';
  await db.runQuery(sql, [data.title, data.author, data.category, data.total_copies, id]);
  return { message: "Book updated successfully" };
}
async function deleteBook(id) {
  await db.runQuery('DELETE FROM books WHERE id = ?', [id]);
  return { message: "Book deleted successfully" };
}

module.exports = { createBook, getBooks, updateBook, deleteBook };