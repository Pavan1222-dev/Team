
const loanRepository = require("../data-access/loanRepository");

function issueBook(bookId, memberId) {
  const book = loanRepository.getBook(bookId);

  if (!book) {
    throw new Error("BOOK_NOT_FOUND");
  }

  const member = loanRepository.getMember(memberId);

  if (!member) {
    throw new Error("MEMBER_NOT_FOUND");
  }

  if (book.available_copies < 1) {
    throw new Error("NO_COPIES_AVAILABLE");
  }

  if (loanRepository.countActiveLoans(memberId) >= 3) {
    throw new Error("LOAN_LIMIT_REACHED");
  }

  if (loanRepository.hasActiveLoan(bookId, memberId)) {
    throw new Error("BOOK_ALREADY_ISSUED");
  }

  const issueDate = new Date().toISOString().slice(0, 10);

  const due = new Date();
  due.setUTCDate(due.getUTCDate() + 14);
  const dueDate = due.toISOString().slice(0, 10);

  return loanRepository.issueBook(
    bookId,
    memberId,
    issueDate,
    dueDate
  );
}

function returnBook(id) {
  const loan = loanRepository.getLoanById(id);

  if (!loan) {
    throw new Error("LOAN_NOT_FOUND");
  }

  if (loan.return_date !== null) {
    throw new Error("BOOK_ALREADY_RETURNED");
  }

  const returnDate = new Date().toISOString().slice(0, 10);
  const due = new Date(loan.due_date + "T00:00:00Z");
  const returned = new Date(returnDate + "T00:00:00Z");

  const difference = returned.getTime() - due.getTime();
  const lateDays = Math.max(
    0,
    Math.floor(difference / (1000 * 60 * 60 * 24))
  );

  const lateFee = lateDays * 10;

  const updatedLoan = loanRepository.returnBook(
    id,
    returnDate,
    lateFee
  );

  return {
    loan: updatedLoan,
    late_days: lateDays,
    late_fee: lateFee
  };
}


function getAllLoans(options) {
  return loanRepository.getAllLoans(options);
}

function getOverdueLoans(options) {
  const today = new Date().toISOString().slice(0, 10);

  return loanRepository.getOverdueLoans(today, options);
}


module.exports = {
  issueBook,
  returnBook,
  getAllLoans,
  getOverdueLoans
};
