import { libraryService } from '../services/library-service.js';
import { validate } from '../utils/validate.js';
import { bookCreateSchema, bookUpdateSchema, memberCreateSchema, memberUpdateSchema, issueLoanSchema } from '../validation/schemas.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data, error: null });
export const controller = {
  listBooks: async (req, res) => ok(res, await libraryService.listBooks(req.query)),
  getBook: async (req, res) => ok(res, await libraryService.getBook(req.params.id)),
  createBook: async (req, res) => ok(res, await libraryService.createBook(validate(bookCreateSchema, req.body)), 201),
  updateBook: async (req, res) => ok(res, await libraryService.updateBook(req.params.id, validate(bookUpdateSchema, req.body))),
  deleteBook: async (req, res) => { await libraryService.deleteBook(req.params.id); return res.status(204).end(); },
  listMembers: async (req, res) => ok(res, await libraryService.listMembers(req.query)),
  getMember: async (req, res) => ok(res, await libraryService.getMember(req.params.id)),
  createMember: async (req, res) => ok(res, await libraryService.createMember(validate(memberCreateSchema, req.body)), 201),
  updateMember: async (req, res) => ok(res, await libraryService.updateMember(req.params.id, validate(memberUpdateSchema, req.body))),
  deleteMember: async (req, res) => { await libraryService.deleteMember(req.params.id); return res.status(204).end(); },
  issueLoan: async (req, res) => ok(res, await libraryService.issueLoan(validate(issueLoanSchema, req.body)), 201),
  returnLoan: async (req, res) => ok(res, await libraryService.returnLoan(req.params.id)),
  listLoans: async (req, res) => ok(res, await libraryService.listLoans(req.query)),
};
