import { z } from 'zod';

const text = (label) => z.string().trim().min(1, `${label} is required`);
export const bookCreateSchema = z.object({
  title: text('Title'), author: text('Author'),
  isbn: z.string().trim().min(10, 'ISBN must be at least 10 characters').max(17, 'ISBN must be at most 17 characters'),
  category: text('Category'),
  totalCopies: z.number().int().min(1, 'Total copies must be at least 1'),
}).strict();
export const bookUpdateSchema = bookCreateSchema.partial().refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');
export const memberCreateSchema = z.object({
  name: text('Name'),
  email: z.email('Enter a valid email address').trim().toLowerCase(),
  phone: text('Phone'),
  membershipType: z.enum(['standard', 'premium', 'student'], 'Membership type must be standard, premium, or student'),
}).strict();
export const memberUpdateSchema = memberCreateSchema.partial().refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');
export const issueLoanSchema = z.object({ bookId: z.uuid('Book ID must be a valid UUID'), memberId: z.uuid('Member ID must be a valid UUID') }).strict();
