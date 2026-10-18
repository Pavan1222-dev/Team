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
    await run(request(createApp({ database })));
  } finally {
    await database.close();
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
