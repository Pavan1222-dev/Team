const DUPLICATE_ISBN_CODE = 'BOOK_ISBN_CONFLICT';

export function createBooksRepository(database) {
  return {
    async create(book) {
      try {
        const result = await database.run(
          `INSERT INTO books (title, author, isbn, category, copies_total, copies_available)
           VALUES (?, ?, ?, ?, ?, ?)`,
          book.title,
          book.author,
          book.isbn,
          book.category,
          book.totalCopies,
          book.totalCopies,
        );

        const row = await database.get(
          `SELECT id, title, author, isbn, category, copies_total, copies_available, created_at
           FROM books WHERE id = ?`,
          result.lastID,
        );

        return {
          id: row.id,
          title: row.title,
          author: row.author,
          isbn: row.isbn,
          category: row.category,
          totalCopies: row.copies_total,
          availableCopies: row.copies_available,
          createdAt: row.created_at,
        };
      } catch (error) {
        // Treat only the ISBN uniqueness failure as a conflict; other constraints remain unexpected errors.
        if (
          error.code?.startsWith('SQLITE_CONSTRAINT') &&
          error.message.includes('UNIQUE constraint failed: books.isbn')
        ) {
          const conflict = new Error('A book with this ISBN already exists.', { cause: error });
          conflict.code = DUPLICATE_ISBN_CODE;
          throw conflict;
        }

        throw error;
      }
    },
  };
}
