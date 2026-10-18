import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { JsonRepository } from './json-repository.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dataDirectory = resolve(projectRoot, 'data');
export const booksRepository = new JsonRepository(resolve(dataDirectory, 'books.json'));
export const membersRepository = new JsonRepository(resolve(dataDirectory, 'members.json'));
export const loansRepository = new JsonRepository(resolve(dataDirectory, 'loans.json'));
