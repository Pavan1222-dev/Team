import express from "express";
import * as loanController from "../controllers/loanController.js";
import { validate } from "../middlewares/validationMiddleware.js";
import {
  idParamsSchema,
  loanCreateSchema,
  loanQuerySchema,
  returnLoanSchema
} from "../validations/schemas.js";

// Define URLs for issuing, listing, and returning books.
const router = express.Router();
router.get('/', validate(loanQuerySchema, 'query'), loanController.listLoans);
router.get('/overdue', validate(loanQuerySchema, 'query'), loanController.listOverdueLoans);
router.post('/', validate(loanCreateSchema), loanController.issueLoan);
router.post(
  '/:id/return',
  validate(idParamsSchema, 'params'),
  validate(returnLoanSchema),
  loanController.returnLoan
);
export default router;