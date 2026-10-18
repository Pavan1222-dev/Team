export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    author TEXT NOT NULL CHECK (length(trim(author)) > 0),
    category TEXT NOT NULL DEFAULT 'Uncategorized' CHECK (length(trim(category)) > 0),
    isbn TEXT NOT NULL UNIQUE CHECK (length(trim(isbn)) > 0),
    published_year INTEGER CHECK (published_year IS NULL OR published_year BETWEEN 0 AND 9999),
    copies_total INTEGER NOT NULL DEFAULT 1 CHECK (copies_total >= 0),
    copies_available INTEGER NOT NULL DEFAULT 1 CHECK (
      copies_available >= 0 AND copies_available <= copies_total
    ),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    email TEXT NOT NULL UNIQUE CHECK (length(trim(email)) > 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL REFERENCES books(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    member_id INTEGER NOT NULL REFERENCES members(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    loan_date TEXT NOT NULL DEFAULT (date('now')),
    due_date TEXT NOT NULL,
    return_date TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned')),
    CHECK (due_date >= loan_date),
    CHECK (return_date IS NULL OR return_date >= loan_date),
    CHECK (
      (status = 'active' AND return_date IS NULL) OR
      (status = 'returned' AND return_date IS NOT NULL)
    )
  )`,
];

export async function initializeSchema(database) {
  for (const statement of schemaStatements) {
    await database.exec(statement);
  }

  // Existing Stage 1 databases predate book categories, so add the column in place.
  const bookColumns = await database.all('PRAGMA table_info(books)');
  if (!bookColumns.some(({ name }) => name === 'category')) {
    await database.exec(
      "ALTER TABLE books ADD COLUMN category TEXT NOT NULL DEFAULT 'Uncategorized' CHECK (length(trim(category)) > 0)",
    );
  }
}
