import { all, get, run, transaction } from "./dbConnection.js";

// Include book and member names when returning a loan.
const LOAN_SELECT = `
  SELECT loans.id,
         loans.book_id AS bookId, books.title AS bookTitle, books.isbn AS bookIsbn,
         loans.member_id AS memberId, members.name AS memberName, members.email AS memberEmail,
         loans.issued_at AS issuedAt, loans.due_at AS dueAt, loans.returned_at AS returnedAt,
         loans.late_fee AS lateFee
  FROM loans
  JOIN books ON books.id = loans.book_id
  JOIN members ON members.id = loans.member_id
`;

// Check the loan rules and save an issue in one transaction.
async function issueLoan({ bookId, memberId, issuedAt, dueAt }) {
  return transaction(async (tx) => {
    const book = await tx.get('SELECT id, available_copies AS availableCopies FROM books WHERE id = ?', [bookId]);
    if (!book) return { outcome: 'book-not-found' };
    if (book.availableCopies < 1) return { outcome: 'out-of-stock' };

    const member = await tx.get('SELECT id FROM members WHERE id = ?', [memberId]);
    if (!member) return { outcome: 'member-not-found' };

    const activeLoans = await tx.get(
      'SELECT COUNT(*) AS total FROM loans WHERE member_id = ? AND returned_at IS NULL',
      [memberId]
    );
    if (activeLoans.total >= 3) return { outcome: 'loan-limit' };

    await tx.run('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?', [bookId]);
    const inserted = await tx.run(
      'INSERT INTO loans (book_id, member_id, issued_at, due_at) VALUES (?, ?, ?, ?)',
      [bookId, memberId, issuedAt, dueAt]
    );
    const loan = await tx.get(`${LOAN_SELECT} WHERE loans.id = ?`, [inserted.lastID]);
    return { outcome: 'issued', loan };
  });
}

// Mark a loan returned and make its book available again.
async function returnLoan(id, returnedAt, lateFee) {
  return transaction(async (tx) => {
    const existing = await tx.get('SELECT id, book_id AS bookId, returned_at AS returnedAt FROM loans WHERE id = ?', [id]);
    if (!existing) return { outcome: 'loan-not-found' };
    if (existing.returnedAt) return { outcome: 'already-returned' };

    await tx.run(
      'UPDATE loans SET returned_at = ?, late_fee = ? WHERE id = ? AND returned_at IS NULL',
      [returnedAt, lateFee, id]
    );
    await tx.run(
      'UPDATE books SET available_copies = available_copies + 1 WHERE id = ?',
      [existing.bookId]
    );
    const loan = await tx.get(`${LOAN_SELECT} WHERE loans.id = ?`, [id]);
    return { outcome: 'returned', loan };
  });
}

// Look up a loan and list loans, including overdue ones.
async function findLoanById(id) {
  return get(`${LOAN_SELECT} WHERE loans.id = ?`, [id]);
}

async function listLoans({ overdueOnly, now, sortBy, order, limit, offset }) {
  const where = overdueOnly
    ? 'WHERE loans.returned_at IS NULL AND loans.due_at < ?'
    : '';
  const parameters = overdueOnly ? [now] : [];
  const countRow = await get(
    `SELECT COUNT(*) AS total FROM loans ${where}`,
    parameters
  );
  const items = await all(
    `${LOAN_SELECT} ${where} ORDER BY loans.${sortBy} ${order}, loans.id ASC LIMIT ? OFFSET ?`,
    [...parameters, limit, offset]
  );
  return { items, total: countRow.total };
}

export { findLoanById, issueLoan, listLoans, returnLoan };