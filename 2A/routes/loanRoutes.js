
const express = require("express");
const router = express.Router();
const validate = require("../middleware/validate");
const { issueLoanSchema } = require("../validations/loanValidation");

const loanController = require("../controllers/loanController");

router.post(
  "/",
  validate(issueLoanSchema),
  loanController.issueBook
);
router.post("/:id/return", loanController.returnBook);
router.get("/", loanController.getAllLoans);

module.exports = router;
