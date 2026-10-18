import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';
import { createApp } from '../app.js';
import { createDatabase } from '../db/database.js';

const validBook = {
  title: '  The Left Hand of Darkness  ',
  author: ' Ursula K. Le Guin ',
  isbn: ' 978-0441478125 ',
  category: ' Science Fiction ',
  totalCopies: 3,
};

async function withIsolatedApp(run) {
  const database = await createDatabase(':memory:');

  try {
    await run(request(createApp({ database })), database);
  } finally {
    await database.close();
  }
}

function bookFixture(index, overrides = {}) {
  return {
    title: `Book ${String(index).padStart(2, '0')}`,
    author: `Author ${index}`,
    isbn: `978-000000${String(index).padStart(4, '0')}`,
    category: 'General',
    totalCopies: 2,
    ...overrides,
  };
}

async function seedBooks(client, books) {
  for (const book of books) {
    const response = await client.post('/api/books').send(book);
    assert.equal(response.status, 201);
  }
}

test('POST /api/books creates a book with trimmed text and all copies available', async () => {
  await withIsolatedApp(async (client) => {
    const response = await client.post('/api/books').send(validBook);

    assert.equal(response.status, 201);
    assert.equal(typeof response.body.data.createdAt, 'string');
    assert.deepEqual(response.body, {
      success: true,
      data: {
        id: 1,
        title: 'The Left Hand of Darkness',
        author: 'Ursula K. Le Guin',
        isbn: '978-0441478125',
        category: 'Science Fiction',
        totalCopies: 3,
        availableCopies: 3,
        createdAt: response.body.data.createdAt,
      },
      error: null,
    });
  });
});

test('POST /api/books reports field-level messages when required fields are missing', async () => {
  await withIsolatedApp(async (client) => {
    const response = await client.post('/api/books').send({});

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.data, null);
    assert.deepEqual(
      response.body.error.details.map(({ field }) => field).sort(),
      ['author', 'category', 'isbn', 'title', 'totalCopies'],
    );
    assert.ok(response.body.error.details.every(({ message }) => typeof message === 'string'));
  });
});

test('POST /api/books rejects a non-positive totalCopies value', async () => {
  await withIsolatedApp(async (client) => {
    const response = await client.post('/api/books').send({ ...validBook, totalCopies: 0 });

    assert.equal(response.status, 400);
    assert.ok(response.body.error.details.some(({ field }) => field === 'totalCopies'));
  });
});

test('POST /api/books returns 409 when the ISBN uniqueness constraint is hit', async () => {
  await withIsolatedApp(async (client) => {
    const firstResponse = await client.post('/api/books').send(validBook);
    const duplicateResponse = await client.post('/api/books').send({
      ...validBook,
      title: 'Another title',
    });

    assert.equal(firstResponse.status, 201);
    assert.equal(duplicateResponse.status, 409);
    assert.deepEqual(duplicateResponse.body, {
      success: false,
      data: null,
      error: { message: 'A book with this ISBN already exists.', details: null },
    });
  });
});

test('POST /api/books rejects a client-supplied availableCopies value', async () => {
  await withIsolatedApp(async (client) => {
    const response = await client.post('/api/books').send({
      ...validBook,
      availableCopies: 0,
    });

    assert.equal(response.status, 400);
    assert.ok(response.body.error.details.some(({ field }) => field === 'availableCopies'));
  });
});

test('GET /api/books returns an empty list and zero pagination totals for an empty table', async () => {
  await withIsolatedApp(async (client) => {
    const response = await client.get('/api/books');

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data, {
      books: [],
      pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 0 },
    });
  });
});

test('GET /api/books lists multiple books with default pagination', async () => {
  await withIsolatedApp(async (client) => {
    await seedBooks(client, [bookFixture(1), bookFixture(2), bookFixture(3)]);
    const response = await client.get('/api/books');

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.books.map(({ title }) => title), [
      'Book 01', 'Book 02', 'Book 03',
    ]);
    assert.deepEqual(response.body.data.pagination, {
      page: 1, limit: 10, totalItems: 3, totalPages: 1,
    });
  });
});

test('GET /api/books filters by title, author, and category', async () => {
  await withIsolatedApp(async (client) => {
    await seedBooks(client, [
      bookFixture(1, { title: 'Practical Python', author: 'Ada Lovelace', category: 'Technology' }),
      bookFixture(2, { title: 'Python Patterns', author: 'Grace Hopper', category: 'Technology' }),
      bookFixture(3, { title: 'A Different Topic', author: 'Ada Lovelace', category: 'History' }),
    ]);

    const byTitle = await client.get('/api/books').query({ title: 'PYTHON' });
    const byAuthor = await client.get('/api/books').query({ author: 'ada' });
    const byCategory = await client.get('/api/books').query({ category: 'History' });

    assert.deepEqual(byTitle.body.data.books.map(({ id }) => id), [1, 2]);
    assert.deepEqual(byAuthor.body.data.books.map(({ id }) => id), [3, 1]);
    assert.deepEqual(byCategory.body.data.books.map(({ id }) => id), [3]);
  });
});

test('GET /api/books combines supplied filters and counts only matching books', async () => {
  await withIsolatedApp(async (client) => {
    await seedBooks(client, [
      bookFixture(1, { title: 'Python One', author: 'Ada Lovelace', category: 'Technology' }),
      bookFixture(2, { title: 'Python Two', author: 'Ada Lovelace', category: 'Technology' }),
      bookFixture(3, { title: 'Python Three', author: 'Grace Hopper', category: 'Technology' }),
      bookFixture(4, { title: 'Python Four', author: 'Ada Lovelace', category: 'Fiction' }),
      bookFixture(5, { title: 'Other', author: 'Ada Lovelace', category: 'Technology' }),
    ]);

    const response = await client.get('/api/books').query({
      title: 'python', author: 'ada', category: 'Technology', limit: 1,
    });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.books.map(({ title }) => title), ['Python One']);
    assert.deepEqual(response.body.data.pagination, {
      page: 1, limit: 1, totalItems: 2, totalPages: 2,
    });
  });
});

test('GET /api/books supports custom page and limit values', async () => {
  await withIsolatedApp(async (client) => {
    await seedBooks(client, Array.from({ length: 12 }, (_, index) => bookFixture(index + 1)));

    const page = await client.get('/api/books').query({ page: 2, limit: 3 });
    const defaults = await client.get('/api/books');

    assert.deepEqual(page.body.data.books.map(({ title }) => title), [
      'Book 04', 'Book 05', 'Book 06',
    ]);
    assert.deepEqual(page.body.data.pagination, {
      page: 2, limit: 3, totalItems: 12, totalPages: 4,
    });
    assert.equal(defaults.body.data.books.length, 10);
    assert.equal(defaults.body.data.pagination.totalPages, 2);
  });
});

test('GET /api/books sorts ascending and descending, accepting case-insensitive order', async () => {
  await withIsolatedApp(async (client) => {
    await seedBooks(client, [
      bookFixture(1, { title: 'Orbit' }),
      bookFixture(2, { title: 'Atlas' }),
      bookFixture(3, { title: 'Nebula' }),
    ]);

    const ascending = await client.get('/api/books').query({ sortBy: 'title', order: 'ASC' });
    const descending = await client.get('/api/books').query({ sortBy: 'title', order: 'dEsC' });

    assert.deepEqual(ascending.body.data.books.map(({ title }) => title), ['Atlas', 'Nebula', 'Orbit']);
    assert.deepEqual(descending.body.data.books.map(({ title }) => title), ['Orbit', 'Nebula', 'Atlas']);
  });
});

test('GET /api/books rejects invalid page, limit, sortBy, and order values', async () => {
  await withIsolatedApp(async (client) => {
    const invalidQueries = [
      { query: { page: 0 }, field: 'page' },
      { query: { limit: 'nope' }, field: 'limit' },
      { query: { sortBy: 'created_at' }, field: 'sortBy' },
      { query: { order: 'sideways' }, field: 'order' },
    ];

    for (const { query, field } of invalidQueries) {
      const response = await client.get('/api/books').query(query);

      assert.equal(response.status, 400);
      assert.equal(response.body.success, false);
      assert.ok(response.body.error.details.some((detail) => detail.field === field));
    }
  });
});

test('GET /api/books returns no books for a page beyond the last page', async () => {
  await withIsolatedApp(async (client) => {
    await seedBooks(client, [bookFixture(1), bookFixture(2)]);
    const response = await client.get('/api/books').query({ page: 9, limit: 1 });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.books, []);
    assert.deepEqual(response.body.data.pagination, {
      page: 9, limit: 1, totalItems: 2, totalPages: 2,
    });
  });
});

test('GET /api/books safely treats SQL wildcard and quote characters as search text', async () => {
  await withIsolatedApp(async (client) => {
    await seedBooks(client, [
      bookFixture(1, { title: "A 100%_author's guide" }),
      bookFixture(2, { title: "A 100xx-author's guide" }),
    ]);
    const response = await client.get('/api/books').query({ title: "100%_author's" });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.books.map(({ id }) => id), [1]);
    assert.equal(response.body.data.pagination.totalItems, 1);
  });
});

test('GET /api/books/:id returns a matching book', async () => {
  await withIsolatedApp(async (client) => {
    const created = await client.post('/api/books').send(validBook);
    const response = await client.get(`/api/books/${created.body.data.id}`);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data, created.body.data);
    assert.equal(response.body.success, true);
    assert.equal(response.body.error, null);
  });
});

test('GET /api/books/:id validates IDs and returns 404 for missing books', async () => {
  await withIsolatedApp(async (client) => {
    const invalidId = await client.get('/api/books/0');
    const missingBook = await client.get('/api/books/999');

    assert.equal(invalidId.status, 400);
    assert.ok(invalidId.body.error.details.some(({ field }) => field === 'id'));
    assert.equal(missingBook.status, 404);
    assert.equal(missingBook.body.error.message, 'Book not found.');
  });
});

test('PUT /api/books/:id updates supplied fields and trims text', async () => {
  await withIsolatedApp(async (client) => {
    const created = await client.post('/api/books').send(validBook);
    const response = await client.put(`/api/books/${created.body.data.id}`).send({
      title: '  Updated Title  ',
      category: '  Reference  ',
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.title, 'Updated Title');
    assert.equal(response.body.data.category, 'Reference');
    assert.equal(response.body.data.author, 'Ursula K. Le Guin');
    assert.equal(response.body.data.totalCopies, 3);
    assert.equal(response.body.data.availableCopies, 3);
  });
});

test('PUT /api/books/:id preserves the checked-out count when increasing total copies', async () => {
  await withIsolatedApp(async (client, database) => {
    const created = await client.post('/api/books').send({ ...validBook, totalCopies: 4 });
    const bookId = created.body.data.id;
    const member = await database.run(
      'INSERT INTO members (name, email) VALUES (?, ?)',
      'Test Member',
      'member@example.test',
    );
    await database.run(
      `INSERT INTO loans (book_id, member_id, loan_date, due_date, status)
       VALUES (?, ?, date('now'), '2999-12-31', 'active')`,
      bookId,
      member.lastID,
    );
    await database.run('UPDATE books SET copies_available = 3 WHERE id = ?', bookId);

    const increased = await client.put(`/api/books/${bookId}`).send({ totalCopies: 5 });

    assert.equal(increased.status, 200);
    assert.equal(increased.body.data.totalCopies, 5);
    assert.equal(increased.body.data.availableCopies, 4);
  });
});

test('PUT /api/books/:id rejects reductions below active loans and keeps inventory unchanged', async () => {
  await withIsolatedApp(async (client, database) => {
    const created = await client.post('/api/books').send({ ...validBook, totalCopies: 4 });
    const bookId = created.body.data.id;
    const member = await database.run(
      'INSERT INTO members (name, email) VALUES (?, ?)',
      'Loaned Member',
      'loaned@example.test',
    );
    await database.run(
      `INSERT INTO loans (book_id, member_id, loan_date, due_date, status)
       VALUES (?, ?, date('now'), '2999-12-31', 'active')`,
      bookId,
      member.lastID,
    );
    await database.run(
      `INSERT INTO loans (book_id, member_id, loan_date, due_date, status)
       VALUES (?, ?, date('now'), '2999-12-31', 'active')`,
      bookId,
      member.lastID,
    );
    await database.run('UPDATE books SET copies_available = 2 WHERE id = ?', bookId);

    const response = await client.put(`/api/books/${bookId}`).send({ totalCopies: 1 });
    const unchanged = await client.get(`/api/books/${bookId}`);

    assert.equal(response.status, 409);
    assert.match(response.body.error.message, /copies currently checked out/);
    assert.equal(unchanged.body.data.totalCopies, 4);
    assert.equal(unchanged.body.data.availableCopies, 2);
  });
});

test('PUT /api/books/:id validates supplied fields and rejects availableCopies', async () => {
  await withIsolatedApp(async (client) => {
    const created = await client.post('/api/books').send(validBook);
    const emptyUpdate = await client.put(`/api/books/${created.body.data.id}`).send({});
    const badCopies = await client.put(`/api/books/${created.body.data.id}`).send({ totalCopies: -1 });
    const clientAvailability = await client.put(`/api/books/${created.body.data.id}`).send({
      availableCopies: 100,
    });

    assert.equal(emptyUpdate.status, 400);
    assert.equal(badCopies.status, 400);
    assert.ok(badCopies.body.error.details.some(({ field }) => field === 'totalCopies'));
    assert.equal(clientAvailability.status, 400);
    assert.ok(clientAvailability.body.error.details.some(({ field }) => field === 'availableCopies'));
  });
});

test('PUT /api/books/:id returns 404 for missing records and 409 for duplicate ISBN', async () => {
  await withIsolatedApp(async (client) => {
    const first = await client.post('/api/books').send(validBook);
    const second = await client.post('/api/books').send(bookFixture(2));

    const missing = await client.put('/api/books/999').send({ title: 'Missing' });
    const duplicate = await client.put(`/api/books/${second.body.data.id}`).send({
      isbn: first.body.data.isbn,
    });

    assert.equal(missing.status, 404);
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error.message, 'A book with this ISBN already exists.');
  });
});

test('PUT /api/books/:id validates the ID', async () => {
  await withIsolatedApp(async (client) => {
    const response = await client.put('/api/books/not-an-id').send({ title: 'Valid title' });

    assert.equal(response.status, 400);
    assert.ok(response.body.error.details.some(({ field }) => field === 'id'));
  });
});

test('DELETE /api/books/:id returns an empty 204 response when deletion succeeds', async () => {
  await withIsolatedApp(async (client) => {
    const created = await client.post('/api/books').send(validBook);
    const response = await client.delete(`/api/books/${created.body.data.id}`);

    assert.equal(response.status, 204);
    assert.equal(response.text, '');
  });
});

test('DELETE /api/books/:id validates IDs and returns 404 for missing books', async () => {
  await withIsolatedApp(async (client) => {
    const invalidId = await client.delete('/api/books/-2');
    const missingBook = await client.delete('/api/books/999');

    assert.equal(invalidId.status, 400);
    assert.ok(invalidId.body.error.details.some(({ field }) => field === 'id'));
    assert.equal(missingBook.status, 404);
    assert.equal(missingBook.body.error.message, 'Book not found.');
  });
});

test('DELETE /api/books/:id returns 409 and preserves loan history', async () => {
  await withIsolatedApp(async (client, database) => {
    const created = await client.post('/api/books').send(validBook);
    const member = await database.run(
      'INSERT INTO members (name, email) VALUES (?, ?)',
      'History Member',
      'history@example.test',
    );
    await database.run(
      `INSERT INTO loans (book_id, member_id, loan_date, due_date, return_date, status)
       VALUES (?, ?, date('now'), '2999-12-31', date('now'), 'returned')`,
      created.body.data.id,
      member.lastID,
    );

    const response = await client.delete(`/api/books/${created.body.data.id}`);
    const stillExists = await client.get(`/api/books/${created.body.data.id}`);
    const loans = await database.all('SELECT id FROM loans WHERE book_id = ?', created.body.data.id);

    assert.equal(response.status, 409);
    assert.match(response.body.error.message, /loan records reference it/);
    assert.equal(stillExists.status, 200);
    assert.equal(loans.length, 1);
  });
});
