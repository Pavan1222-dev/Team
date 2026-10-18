const DUPLICATE_ISBN_CODE = 'BOOK_ISBN_CONFLICT';
const REPOSITORY_CONFLICTS = new Map([
  [DUPLICATE_ISBN_CODE, 409],
  ['BOOK_INVENTORY_CONFLICT', 409],
  ['BOOK_HAS_LOANS', 409],
]);

async function handleRepositoryConflicts(operation) {
  try {
    return await operation();
  } catch (error) {
    const status = REPOSITORY_CONFLICTS.get(error.code);
    if (!status) {
      throw error;
    }

    const conflict = new Error(error.message, { cause: error });
    conflict.status = status;
    throw conflict;
  }
}

export function createBooksService(repository) {
  return {
    async createBook(book) {
      return handleRepositoryConflicts(() => repository.create(book));
    },

    async listBooks(filters) {
      return repository.list(filters);
    },

    async getBookById(id) {
      return repository.getById(id);
    },

    async updateBook(id, changes) {
      return handleRepositoryConflicts(() => repository.update(id, changes));
    },

    async deleteBook(id) {
      return handleRepositoryConflicts(() => repository.delete(id));
    },
  };
}
