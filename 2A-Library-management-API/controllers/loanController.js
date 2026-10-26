const loanService = require('../services/loanService');

async function issueBook(req, res, next) {
  try {
    let memberId = req.body.member_id;
    let bookId = req.body.book_id;

    let result = await loanService.issueBook(memberId, bookId);
    res.status(201).json({ success: true, data: result, error: null });
  } catch (error) {
    next(error);
  }
}

async function returnBook(req, res, next) {
  try {
    let loanId = Number(req.params.id);
    let result = await loanService.returnBook(loanId);
    res.status(200).json({ success: true, data: result, error: null });
  } catch (error) {
    next(error);
  }
}

async function getOverdueLoans(req, res, next) {
  try {
    let result = await loanService.getOverdueLoans();
    res.status(200).json({ success: true, data: result, error: null });
  } catch (error) {
    next(error);
  }
}

module.exports = { issueBook, returnBook, getOverdueLoans };