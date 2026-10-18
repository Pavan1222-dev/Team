import { booksRepository, membersRepository, loansRepository } from '../data/repositories.js';
import { AppError } from '../utils/app-error.js';
import { paginateAndSort } from '../utils/pagination.js';

const ACTIVE = 'active';
const contains = (value, term) => String(value).toLocaleLowerCase().includes(term.toLocaleLowerCase());

export const libraryService = {
  async listBooks(query) {
    let books = await booksRepository.readAll();
    for (const field of ['title', 'author', 'category']) if (query[field]) books = books.filter((book) => contains(book[field], query[field]));
    return paginateAndSort(books, query, ['title', 'author', 'category', 'isbn', 'totalCopies', 'availableCopies', 'createdAt']);
  },
  async getBook(id) { const book = await booksRepository.findById(id); if (!book) throw new AppError(404, 'Book not found'); return book; },
  async createBook(input) {
    if (await booksRepository.findOne((book) => book.isbn.toLowerCase() === input.isbn.toLowerCase())) throw new AppError(409, 'A book with this ISBN already exists');
    return booksRepository.create({ ...input, availableCopies: input.totalCopies });
  },
  async updateBook(id, changes) {
    const book = await this.getBook(id);
    if (changes.isbn && changes.isbn.toLowerCase() !== book.isbn.toLowerCase() && await booksRepository.findOne((item) => item.isbn.toLowerCase() === changes.isbn.toLowerCase())) throw new AppError(409, 'A book with this ISBN already exists');
    if (changes.totalCopies !== undefined) {
      const borrowedCopies = book.totalCopies - book.availableCopies;
      if (changes.totalCopies < borrowedCopies) throw new AppError(409, 'Total copies cannot be less than the number currently on loan');
      changes.availableCopies = changes.totalCopies - borrowedCopies;
    }
    return booksRepository.update(id, changes);
  },
  async deleteBook(id) {
    await this.getBook(id);
    if (await loansRepository.findOne((loan) => loan.bookId === id && loan.status === ACTIVE)) throw new AppError(409, 'A book with active loans cannot be deleted');
    await booksRepository.delete(id);
  },
  async listMembers(query) { return paginateAndSort(await membersRepository.readAll(), query, ['name', 'email', 'membershipType', 'createdAt']); },
  async getMember(id) { const member = await membersRepository.findById(id); if (!member) throw new AppError(404, 'Member not found'); return member; },
  async createMember(input) {
    if (await membersRepository.findOne((member) => member.email.toLowerCase() === input.email.toLowerCase())) throw new AppError(409, 'A member with this email already exists');
    return membersRepository.create(input);
  },
  async updateMember(id, changes) {
    const member = await this.getMember(id);
    if (changes.email && changes.email !== member.email && await membersRepository.findOne((item) => item.email === changes.email)) throw new AppError(409, 'A member with this email already exists');
    return membersRepository.update(id, changes);
  },
  async deleteMember(id) {
    await this.getMember(id);
    if (await loansRepository.findOne((loan) => loan.memberId === id && loan.status === ACTIVE)) throw new AppError(409, 'A member with active loans cannot be deleted');
    await membersRepository.delete(id);
  },
  async issueLoan({ bookId, memberId }) {
    const book = await this.getBook(bookId);
    await this.getMember(memberId);
    if (book.availableCopies < 1) throw new AppError(409, 'No copies of this book are available');
    const activeLoans = (await loansRepository.readAll()).filter((loan) => loan.memberId === memberId && loan.status === ACTIVE);
    if (activeLoans.length >= 3) throw new AppError(409, 'A member cannot have more than 3 active loans');
    const issuedAt = new Date();
    const dueAt = new Date(issuedAt);
    dueAt.setDate(dueAt.getDate() + 14);
    const loan = await loansRepository.create({ bookId, memberId, issuedAt: issuedAt.toISOString(), dueAt: dueAt.toISOString(), returnedAt: null, status: ACTIVE, lateFee: null });
    await booksRepository.update(bookId, { availableCopies: book.availableCopies - 1 });
    return loan;
  },
  async returnLoan(id) {
    const loan = await loansRepository.findById(id);
    if (!loan) throw new AppError(404, 'Loan not found');
    if (loan.status !== ACTIVE) throw new AppError(409, 'This loan has already been returned');
    const returnedAt = new Date();
    const overdueDays = Math.max(0, Math.floor((returnedAt - new Date(loan.dueAt)) / 86400000));
    const lateFee = overdueDays * 10;
    const book = await this.getBook(loan.bookId);
    const updated = await loansRepository.update(id, { status: 'returned', returnedAt: returnedAt.toISOString(), overdueDays, lateFee });
    await booksRepository.update(book.id, { availableCopies: book.availableCopies + 1 });
    return updated;
  },
  async listLoans(query) {
    let loans = await loansRepository.readAll();
    if (query.status) loans = loans.filter((loan) => loan.status === query.status);
    if (query.overdue === 'true') {
      const now = Date.now();
      loans = loans.filter((loan) => loan.status === ACTIVE && new Date(loan.dueAt).getTime() < now);
    }
    return paginateAndSort(loans, query, ['issuedAt', 'dueAt', 'returnedAt', 'status', 'lateFee', 'createdAt']);
  },
};
