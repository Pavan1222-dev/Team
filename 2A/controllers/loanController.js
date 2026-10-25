
const loanService = require("../services/loanService");

function issueBook(req, res) {
  const { book_id, member_id } = req.body;

  if (
    !Number.isInteger(book_id) ||
    book_id <= 0 ||
    !Number.isInteger(member_id) ||
    member_id <= 0
  ) {
    return res.status(400).json({
      success: false,
      error: "book_id and member_id must be positive integers"
    });
  }

  try {
    const loan = loanService.issueBook(book_id, member_id);

    return res.status(201).json({
      success: true,
      data: loan
    });
  } catch (error) {
    const errors = {
      BOOK_NOT_FOUND: [404, "Book not found"],
      MEMBER_NOT_FOUND: [404, "Member not found"],
      NO_COPIES_AVAILABLE: [409, "No copies available"],
      LOAN_LIMIT_REACHED: [409, "Member already has 3 active loans"],
      BOOK_ALREADY_ISSUED: [409, "Member already has this book"]
    };

    const [status, message] = errors[error.message] || [
      500,
      "Unable to issue book"
    ];

    return res.status(status).json({
      success: false,
      error: message
    });
  }
}

function returnBook(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      error: "Loan ID must be a positive integer"
    });
  }

  try {
    const result = loanService.returnBook(id);

    return res.status(200).json({
      success: true,
      data: {
        loan: result.loan,
        late_days: result.late_days,
        late_fee: result.late_fee
      }
    });
  } catch (error) {
    const errors = {
      LOAN_NOT_FOUND: [404, "Loan not found"],
      BOOK_ALREADY_RETURNED: [409, "Book has already been returned"]
    };

    const [status, message] = errors[error.message] || [
      500,
      "Unable to return book"
    ];

    return res.status(status).json({
      success: false,
      error: message
    });
  }
}


function getAllLoans(req, res) {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);
  const sortBy = req.query.sortBy ??
    (req.query.overdue === "true" ? "due_date" : "id");
  const order = (req.query.order ?? "asc").toLowerCase();

  const allowedSortFields = [
    "id",
    "issue_date",
    "due_date",
    "return_date",
    "late_fee",
    "book_title",
    "member_name"
  ];

  if (
    !Number.isInteger(page) || page < 1 ||
    !Number.isInteger(limit) || limit < 1 || limit > 100
  ) {
    return res.status(400).json({
      success: false,
      error: "page must be positive and limit must be between 1 and 100"
    });
  }

  if (
    !allowedSortFields.includes(sortBy) ||
    !["asc", "desc"].includes(order)
  ) {
    return res.status(400).json({
      success: false,
      error: "Invalid sortBy or order value"
    });
  }

  const options = { page, limit, sortBy, order };

  const result = req.query.overdue === "true"
    ? loanService.getOverdueLoans(options)
    : loanService.getAllLoans(options);

  return res.status(200).json({
    success: true,
    data: result.data,
    pagination: {
      totalRecords: result.total,
      currentPage: page,
      pageSize: limit,
      totalPages: Math.ceil(result.total / limit)
    }
  });
}


module.exports = {
  issueBook,
  returnBook,
  getAllLoans
};
