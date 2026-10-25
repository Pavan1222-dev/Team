
const db = require("../database/db");

function getBook(id) {
  return db.prepare(
    "SELECT * FROM books WHERE id = ?"
  ).get(id);
}

function getMember(id) {
  return db.prepare(
    "SELECT * FROM members WHERE id = ?"
  ).get(id);
}

function countActiveLoans(memberId) {
  return db.prepare(`
    SELECT COUNT(*) AS count
    FROM loans
    WHERE member_id = ? AND return_date IS NULL
  `).get(memberId).count;
}

function hasActiveLoan(bookId, memberId) {
  return db.prepare(`
    SELECT id FROM loans
    WHERE book_id = ? AND member_id = ?
      AND return_date IS NULL
  `).get(bookId, memberId);
}

function issueBook(bookId, memberId, issueDate, dueDate) {
  const transaction = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO loans (book_id, member_id, issue_date, due_date)
      VALUES (?, ?, ?, ?)
    `).run(bookId, memberId, issueDate, dueDate);

    db.prepare(`
      UPDATE books
      SET available_copies = available_copies - 1
      WHERE id = ?
    `).run(bookId);

    return db.prepare(
      "SELECT * FROM loans WHERE id = ?"
    ).get(result.lastInsertRowid);
  });

  return transaction();
}

function getLoanById(id) {
  return db.prepare(
    "SELECT * FROM loans WHERE id = ?"
  ).get(id);
}

function returnBook(id, returnDate, lateFee) {
  const transaction = db.transaction(() => {
    db.prepare(`
      UPDATE loans
      SET return_date = ?, late_fee = ?
      WHERE id = ?
    `).run(returnDate, lateFee, id);

    const loan = getLoanById(id);

    db.prepare(`
      UPDATE books
      SET available_copies = available_copies + 1
      WHERE id = ?
    `).run(loan.book_id);

    return loan;
  });

  return transaction();
}


function getAllLoans(options) {
  const { page, limit, sortBy, order } = options;

  const allowedSortFields = [
    "id",
    "issue_date",
    "due_date",
    "return_date",
    "late_fee",
    "book_title",
    "member_name"
  ];

  const safeSortBy = allowedSortFields.includes(sortBy)
    ? sortBy
    : "id";

  const safeOrder = order === "desc" ? "DESC" : "ASC";
  const offset = (page - 1) * limit;

  const data = db.prepare(`
    SELECT loans.*, books.title AS book_title,
           members.name AS member_name
    FROM loans
    JOIN books ON loans.book_id = books.id
    JOIN members ON loans.member_id = members.id
    ORDER BY ${safeSortBy} ${safeOrder}
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  const total = db.prepare(`
    SELECT COUNT(*) AS count
    FROM loans
  `).get().count;

  return { data, total };
}

function getOverdueLoans(today, options) {
  const { page, limit, sortBy, order } = options;

  const allowedSortFields = [
    "id",
    "issue_date",
    "due_date",
    "late_fee",
    "book_title",
    "member_name"
  ];

  const safeSortBy = allowedSortFields.includes(sortBy)
    ? sortBy
    : "due_date";

  const safeOrder = order === "desc" ? "DESC" : "ASC";
  const offset = (page - 1) * limit;

  const data = db.prepare(`
    SELECT loans.*, books.title AS book_title,
           members.name AS member_name
    FROM loans
    JOIN books ON loans.book_id = books.id
    JOIN members ON loans.member_id = members.id
    WHERE loans.return_date IS NULL
      AND loans.due_date < ?
    ORDER BY ${safeSortBy} ${safeOrder}
    LIMIT ? OFFSET ?
  `).all(today, limit, offset);

  const total = db.prepare(`
    SELECT COUNT(*) AS count
    FROM loans
    WHERE return_date IS NULL AND due_date < ?
  `).get(today).count;

  return { data, total };
}


module.exports = {
  getBook,
  getMember,
  countActiveLoans,
  hasActiveLoan,
  issueBook,
  getLoanById,
  returnBook,
  getAllLoans,
  getOverdueLoans
};
