const DUPLICATE_ISBN_CODE = 'BOOK_ISBN_CONFLICT';

export function createBooksService(repository) {
  return {
    async createBook(book) {
      try {
        return await repository.create(book);
      } catch (error) {
        if (error.code === DUPLICATE_ISBN_CODE) {
          const conflict = new Error(error.message, { cause: error });
          conflict.status = 409;
          throw conflict;
        }

        throw error;
      }
    },
  };
}
