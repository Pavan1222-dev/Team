
const bookService = require("../services/bookService");


function getAllBooks(req, res) {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);
  const sortBy = req.query.sortBy ?? "id";
  const order = (req.query.order ?? "asc").toLowerCase();
  const search = req.query.search;

  const allowedSortFields = [
    "id",
    "title",
    "author",
    "category",
    "total_copies",
    "available_copies"
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

  const result = bookService.getAllBooks(search, {
    page,
    limit,
    sortBy,
    order
  });

  res.status(200).json({
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


function getBookById(req, res) {
  const book = bookService.getBookById(req.params.id);

  if (!book) {
    return res.status(404).json({
      success: false,
      error: "Book not found"
    });
  }

  res.status(200).json({
    success: true,
    data: book
  });
}

function createBook(req, res) {
  try {
    const book = bookService.createBook(req.body);

    res.status(201).json({
      success: true,
      data: book
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

function updateBook(req, res) {
  try {
    const id = Number(req.params.id);
    const existingBook = bookService.getBookById(id);

    if (!existingBook) {
      return res.status(404).json({
        success: false,
        error: "Book not found"
      });
    }

    const book = bookService.updateBook(id, req.body);

    res.status(200).json({
      success: true,
      data: book
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

function deleteBook(req, res) {
  try {
    const id = Number(req.params.id);
    const existingBook = bookService.getBookById(id);

    if (!existingBook) {
      return res.status(404).json({
        success: false,
        error: "Book not found"
      });
    }

    bookService.deleteBook(id);
    res.status(204).end();
  } catch (error) {
    res.status(409).json({
      success: false,
      error: "Book cannot be deleted because it has loan records"
    });
  }
}

module.exports = {
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook
};
