const express = require('express');
const { z } = require('zod');
const loanController = require('../controllers/loanController');
const validateBody = require('../middleware/validate');

const router = express.Router();
const issueSchema = z.object({
  member_id: z.number().int("Member ID must be a whole number"),
  book_id: z.number().int("Book ID must be a whole number")
});

router.post('/issue', validateBody(issueSchema), loanController.issueBook);
router.post('/return/:id', loanController.returnBook);
router.get('/overdue', loanController.getOverdueLoans);

module.exports = router;