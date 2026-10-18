const DUPLICATE_ISBN_CODE = 'BOOK_ISBN_CONFLICT';
const SORT_COLUMNS = Object.freeze({
  title: 'title',
  author: 'author',
  category: 'category',
  isbn: 'isbn',
});

function escapeLikePattern(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

function buildBookFilters(filters) {
  const conditions = [];
  const parameters = [];

  for (const field of ['title', 'author']) {
    if (filters[field]) {
      conditions.push(`${field} LIKE ? ESCAPE '\\' COLLATE NOCASE`);
      parameters.push(`%${escapeLikePattern(filters[field])}%`);
    }
  }

  if (filters.category) {
    conditions.push('category = ?');
    parameters.push(filters.category);
  }

  return {
    whereClause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    parameters,
  };
}

function mapBook(row) {
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
}

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

        return mapBook(row);
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

    async list(filters) {
      const { whereClause, parameters } = buildBookFilters(filters);
      const total = await database.get(
        `SELECT COUNT(*) AS totalItems FROM books ${whereClause}`,
        ...parameters,
      );
      const sortColumn = SORT_COLUMNS[filters.sortBy];
      const direction = filters.order === 'desc' ? 'DESC' : 'ASC';
      const offset = (filters.page - 1) * filters.limit;
      const rows = await database.all(
        `SELECT id, title, author, isbn, category, copies_total, copies_available, created_at
         FROM books ${whereClause}
         ORDER BY ${sortColumn} ${direction}, id ASC
         LIMIT ? OFFSET ?`,
        ...parameters,
        filters.limit,
        offset,
      );

      return {
        books: rows.map(mapBook),
        totalItems: total.totalItems,
      };
    },
  };
}
