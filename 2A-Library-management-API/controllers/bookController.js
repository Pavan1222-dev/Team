const bookService = require('../services/bookService');

async function createBook(req, res, next) {
  try {
    let result = await bookService.createBook(req.body);
    res.status(201).json({ success: true, data: result, error: null });
  } catch (error) {
    next(error);
  }
}

async function getBooks(req, res, next) {
  try {
    let page = Number(req.query.page) || 1;
    let limit = Number(req.query.limit) || 10;
    let search = req.query.search || "";

    let result = await bookService.getBooks(page, limit, search);
    res.status(200).json({ success: true, data: result, error: null });
  } catch (error) {
    next(error);
  }
}

async function updateBook(req, res, next) {
  try {
    let id = Number(req.params.id);
    let result = await bookService.updateBook(id, req.body);
    res.status(200).json({ success: true, data: result, error: null });
  } catch (error) {
    next(error);
  }
}

async function deleteBook(req, res, next) {
  try {
    let id = Number(req.params.id);
    let result = await bookService.deleteBook(id);
    res.status(200).json({ success: true, data: result, error: null });
  } catch (error) {
    next(error);
  }
}

module.exports = { createBook, getBooks, updateBook, deleteBook };