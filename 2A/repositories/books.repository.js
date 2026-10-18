const DUPLICATE_ISBN_CODE = 'BOOK_ISBN_CONFLICT';
const INVENTORY_CONFLICT_CODE = 'BOOK_INVENTORY_CONFLICT';
const LOAN_HISTORY_CONFLICT_CODE = 'BOOK_HAS_LOANS';
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

function repositoryConflict(code, message, cause) {
  const conflict = new Error(message, { cause });
  conflict.code = code;
  return conflict;
}

function isDuplicateIsbnError(error) {
  return error.code?.startsWith('SQLITE_CONSTRAINT') &&
    error.message.includes('UNIQUE constraint failed: books.isbn');
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
        if (isDuplicateIsbnError(error)) {
          throw repositoryConflict(
            DUPLICATE_ISBN_CODE,
            'A book with this ISBN already exists.',
            error,
          );
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

    async getById(id) {
      const row = await database.get(
        `SELECT id, title, author, isbn, category, copies_total, copies_available, created_at
         FROM books WHERE id = ?`,
        id,
      );

      return row ? mapBook(row) : null;
    },

    async update(id, changes) {
      let transactionStarted = false;

      try {
        await database.run('BEGIN IMMEDIATE');
        transactionStarted = true;

        const current = await database.get(
          `SELECT id, title, author, isbn, category, copies_total, copies_available, created_at
           FROM books WHERE id = ?`,
          id,
        );
        if (!current) {
          await database.run('ROLLBACK');
          transactionStarted = false;
          return null;
        }

        const activeLoans = await database.get(
          "SELECT COUNT(*) AS count FROM loans WHERE book_id = ? AND status = 'active'",
          id,
        );
        const checkedOutCopies = Math.max(
          current.copies_total - current.copies_available,
          activeLoans.count,
        );
        const totalCopies = changes.totalCopies ?? current.copies_total;

        if (totalCopies < checkedOutCopies) {
          throw repositoryConflict(
            INVENTORY_CONFLICT_CODE,
            `totalCopies cannot be less than the ${checkedOutCopies} copies currently checked out.`,
          );
        }

        const updated = {
          title: changes.title ?? current.title,
          author: changes.author ?? current.author,
          isbn: changes.isbn ?? current.isbn,
          category: changes.category ?? current.category,
          totalCopies,
          availableCopies: totalCopies - checkedOutCopies,
        };

        await database.run(
          `UPDATE books
           SET title = ?, author = ?, isbn = ?, category = ?,
               copies_total = ?, copies_available = ?
           WHERE id = ?`,
          updated.title,
          updated.author,
          updated.isbn,
          updated.category,
          updated.totalCopies,
          updated.availableCopies,
          id,
        );

        const row = await database.get(
          `SELECT id, title, author, isbn, category, copies_total, copies_available, created_at
           FROM books WHERE id = ?`,
          id,
        );
        await database.run('COMMIT');
        transactionStarted = false;
        return mapBook(row);
      } catch (error) {
        if (transactionStarted) {
          await database.run('ROLLBACK').catch(() => {});
        }

        if (isDuplicateIsbnError(error)) {
          throw repositoryConflict(
            DUPLICATE_ISBN_CODE,
            'A book with this ISBN already exists.',
            error,
          );
        }

        throw error;
      }
    },

    async delete(id) {
      try {
        const result = await database.run('DELETE FROM books WHERE id = ?', id);
        return result.changes > 0;
      } catch (error) {
        if (
          error.code?.startsWith('SQLITE_CONSTRAINT') &&
          error.message.includes('FOREIGN KEY constraint failed')
        ) {
          throw repositoryConflict(
            LOAN_HISTORY_CONFLICT_CODE,
            'This book cannot be deleted because loan records reference it.',
            error,
          );
        }

        throw error;
      }
    },
  };
}
