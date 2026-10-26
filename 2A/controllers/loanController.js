import * as loanService from "../services/loanService.js";

// Controllers pass validated input to the loan service.
// Read all loans for the requested page.
async function listLoans(_request, response) {
  const data = await loanService.listLoans(response.locals.validated.query);
  response.status(200).json({ success: true, data, error: null });
}

// Read only loans that are past their due date and not yet returned.
async function listOverdueLoans(_request, response) {
  const data = await loanService.listLoans(response.locals.validated.query, true);
  response.status(200).json({ success: true, data, error: null });
}

// Issue a book and respond with 201 Created.
async function issueLoan(_request, response) {
  const data = await loanService.issueLoan(response.locals.validated.body);
  response.status(201).json({ success: true, data, error: null });
}

// Return a book and send back its late fee.
async function returnLoan(_request, response) {
  const { id } = response.locals.validated.params;
  const data = await loanService.returnLoan(id);
  response.status(200).json({ success: true, data, error: null });
}

export { issueLoan, listLoans, listOverdueLoans, returnLoan };