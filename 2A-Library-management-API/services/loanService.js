const db = require('../data-access/db');
async function issueBook(memberId, bookId) {
  let activeLoans = await db.getAll('SELECT * FROM loans WHERE member_id = ? AND return_date IS NULL', [memberId]);
  if (activeLoans.length >= 3) {
    let err = new Error('Member already has 3 active loans. Cannot issue more.');
    err.status = 400;
    throw err;
  }
  let book = await db.getOne('SELECT * FROM books WHERE id = ?', [bookId]);
  if (!book) {
    let err = new Error('Book not found.');
    err.status = 404;
    throw err;
  }
  if (book.available_copies <= 0) {
    let err = new Error('No copies available right now.');
    err.status = 400;
    throw err;
  }

  let today = new Date().toISOString().split('T')[0];

  await db.runQuery('INSERT INTO loans (book_id, member_id, issue_date, due_date) VALUES (?, ?, ?, ?)', [bookId, memberId, today, today]);
  let newCopies = book.available_copies - 1;
  await db.runQuery('UPDATE books SET available_copies = ? WHERE id = ?', [newCopies, bookId]);

  return { message: "Book issued successfully." };
}
async function returnBook(loanId) {
  let loan = await db.getOne('SELECT * FROM loans WHERE id = ?', [loanId]);
  if (!loan) {
    let err = new Error('Loan not found.');
    err.status = 404;
    throw err;
  }
  if (loan.return_date) {
    let err = new Error('This book is already returned.');
    err.status = 400;
    throw err;
  }
  let todayDate = new Date();
  let issueDate = new Date(loan.issue_date);
  let timeDifference = todayDate.getTime() - issueDate.getTime();
  let daysKept = Math.floor(timeDifference / (1000 * 3600 * 24));

  let lateFee = 0;
  if (daysKept > 14) {
    let extraDays = daysKept - 14;
    lateFee = extraDays * 10;
  }

  let todayString = todayDate.toISOString().split('T')[0];
  await db.runQuery('UPDATE loans SET return_date = ?, late_fee = ? WHERE id = ?', [todayString, lateFee, loanId]);
  let book = await db.getOne('SELECT * FROM books WHERE id = ?', [loan.book_id]);
  await db.runQuery('UPDATE books SET available_copies = ? WHERE id = ?', [book.available_copies + 1, loan.book_id]);

  return {
    message: "Book returned successfully.",
    daysKept: daysKept,
    lateFee: lateFee
  };
}
async function getOverdueLoans() {
  let activeLoans = await db.getAll('SELECT * FROM loans WHERE return_date IS NULL');
  let todayDate = new Date();
  let overdue = [];

  for (let i = 0; i < activeLoans.length; i++) {
    let issueDate = new Date(activeLoans[i].issue_date);
    let timeDifference = todayDate.getTime() - issueDate.getTime();
    let daysKept = Math.floor(timeDifference / (1000 * 3600 * 24));

    if (daysKept > 14) {
      overdue.push(activeLoans[i]);
    }
  }

  return overdue;
}

module.exports = { issueBook, returnBook, getOverdueLoans };