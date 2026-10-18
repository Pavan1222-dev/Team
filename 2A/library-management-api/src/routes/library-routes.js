import { Router } from 'express';
import { controller } from '../controllers/library-controller.js';
import { asyncHandler } from '../utils/async-handler.js';

export const router = Router();
const route = (method, path, handler) => router[method](path, asyncHandler(handler));
route('get', '/books', controller.listBooks);
route('post', '/books', controller.createBook);
route('get', '/books/:id', controller.getBook);
route('patch', '/books/:id', controller.updateBook);
route('delete', '/books/:id', controller.deleteBook);
route('get', '/members', controller.listMembers);
route('post', '/members', controller.createMember);
route('get', '/members/:id', controller.getMember);
route('patch', '/members/:id', controller.updateMember);
route('delete', '/members/:id', controller.deleteMember);
route('get', '/loans', controller.listLoans);
route('post', '/loans', controller.issueLoan);
route('post', '/loans/:id/return', controller.returnLoan);
