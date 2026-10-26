import { z } from "zod";

// Reusable fields keep create and update request rules consistent.
const positiveId = z.coerce.number().int().positive();

// These are the fields a book request is allowed to contain.
const bookFields = {
  title: z.string().trim().min(1).max(200),
  author: z.string().trim().min(1).max(120),
  isbn: z.string().trim().min(1).max(20),
  category: z.string().trim().min(1).max(80),
  totalCopies: z.number().int().nonnegative(),
  availableCopies: z.number().int().nonnegative()
};

// These are the fields a member request is allowed to contain.
const memberFields = {
  name: z.string().trim().min(1).max(120),
  email: z.email().trim().max(254),
  phone: z.string().trim().min(3).max(30),
  membershipType: z.string().trim().min(1).max(50)
};

// A new book is available to lend unless a different count is provided.
const createBookSchema = z.object({
  ...bookFields,
  availableCopies: bookFields.availableCopies.optional()
}).strict().refine(
  (book) => book.availableCopies === undefined || book.availableCopies <= book.totalCopies,
  { path: ['availableCopies'], message: 'Cannot exceed totalCopies.' }
);

const updateBookSchema = z.object(bookFields).strict().refine(
  (book) => book.availableCopies <= book.totalCopies,
  { path: ['availableCopies'], message: 'Cannot exceed totalCopies.' }
);

// Check IDs and the two values needed to issue a loan.
const memberSchema = z.object(memberFields).strict();
const idParamsSchema = z.object({ id: positiveId }).strict();
const loanCreateSchema = z.object({
  bookId: positiveId,
  memberId: positiveId
}).strict();
const returnLoanSchema = z.object({}).strict();

// Check list options and prevent invalid sort field names.
function paginationSchema(sortFields) {
  return z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    sortBy: z.enum(sortFields).default(sortFields[0]),
    order: z.enum(['asc', 'desc']).default('asc')
  }).strict();
}

const bookQuerySchema = paginationSchema([
  'id', 'title', 'author', 'isbn', 'category', 'totalCopies', 'availableCopies'
]).extend({
  title: z.string().trim().max(200).optional(),
  author: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional()
}).strict();

const memberQuerySchema = paginationSchema(['id', 'name', 'email', 'membershipType']);
const loanQuerySchema = paginationSchema(['id', 'issuedAt', 'dueAt', 'returnedAt', 'lateFee']).extend({
  overdue: z.enum(['true', 'false']).default('false')
}).strict();

// Export schemas so routes can validate incoming request data.
export {
  bookQuerySchema,
  createBookSchema,
  idParamsSchema,
  loanCreateSchema,
  loanQuerySchema,
  memberQuerySchema,
  memberSchema,
  returnLoanSchema,
  updateBookSchema
};