import * as loanData from "../data_access/loanData.js";

// Business-rule errors are turned into JSON by the error middleware.
class ServiceError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Issue a book only if a copy is free and the member has fewer than 3 loans.
async function issueLoan({ bookId, memberId }) {
  const issuedAt = new Date();
  const dueAt = new Date(issuedAt.getTime() + 14 * 24 * 60 * 60 * 1000);
  const result = await loanData.issueLoan({
    bookId,
    memberId,
    issuedAt: issuedAt.toISOString(),
    dueAt: dueAt.toISOString()
  });

  if (result.outcome === "book-not-found") {
    throw new ServiceError(404, "BOOK_NOT_FOUND", "Book not found.");
  }
  if (result.outcome === "member-not-found") {
    throw new ServiceError(404, "MEMBER_NOT_FOUND", "Member not found.");
  }
  if (result.outcome === "out-of-stock") {
    throw new ServiceError(409, "BOOK_UNAVAILABLE", "No copies of this book are currently available.");
  }
  if (result.outcome === "loan-limit") {
    throw new ServiceError(409, "ACTIVE_LOAN_LIMIT", "A member cannot have more than 3 active loans.");
  }
  return result.loan;
}

// A return date is recorded by the server so it cannot be changed by the client.
async function returnLoan(id) {
  const returnedAt = new Date();
  const loan = await loanData.findLoanById(id);
  if (!loan) throw new ServiceError(404, "LOAN_NOT_FOUND", "Loan not found.");
  if (loan.returnedAt) {
    throw new ServiceError(409, "LOAN_ALREADY_RETURNED", "This loan has already been returned.");
  }

  // Charge Rs 10 for each day (or part of a day) after the due date.
  const daysLate = Math.ceil((returnedAt.getTime() - Date.parse(loan.dueAt)) / 86400000);
  const lateFee = Math.max(0, daysLate) * 10;
  const result = await loanData.returnLoan(id, returnedAt.toISOString(), lateFee);

  if (result.outcome === "loan-not-found") {
    throw new ServiceError(404, "LOAN_NOT_FOUND", "Loan not found.");
  }
  if (result.outcome === "already-returned") {
    throw new ServiceError(409, "LOAN_ALREADY_RETURNED", "This loan has already been returned.");
  }
  return { ...result.loan, lateFee: result.loan.lateFee, lateFeeCurrency: "INR" };
}

// Show all loans, or only loans past their due date.
async function listLoans(query, overdueOnly = false) {
  const result = await loanData.listLoans({
    overdueOnly: overdueOnly || query.overdue === "true",
    now: new Date().toISOString(),
    sortBy:
      {
        issuedAt: "issued_at",
        dueAt: "due_at",
        returnedAt: "returned_at",
        lateFee: "late_fee"
      }[query.sortBy] || query.sortBy,
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

export { issueLoan, listLoans, returnLoan };
