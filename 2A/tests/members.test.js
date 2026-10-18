import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';
import { createApp } from '../app.js';
import { createDatabase } from '../db/database.js';

const validMember = {
  name: '  Morgan Lee  ',
  email: '  Morgan.Lee@example.com  ',
  phone: '  +1 555 0100  ',
  membershipType: '  Community  ',
};

async function withIsolatedApp(run) {
  const database = await createDatabase(':memory:');

  try {
    await run(request(createApp({ database })), database);
  } finally {
    await database.close();
  }
}

function memberFixture(index, overrides = {}) {
  return {
    name: `Member ${String(index).padStart(2, '0')}`,
    email: `member${index}@example.com`,
    phone: `555-01${String(index).padStart(2, '0')}`,
    membershipType: 'Community',
    ...overrides,
  };
}

async function seedMembers(client, members) {
  for (const member of members) {
    const response = await client.post('/api/members').send(member);
    assert.equal(response.status, 201);
  }
}

test('POST /api/members creates a trimmed member and returns database-managed fields', async () => {
  await withIsolatedApp(async (client) => {
    const response = await client.post('/api/members').send(validMember);

    assert.equal(response.status, 201);
    assert.deepEqual(response.body, {
      success: true,
      data: {
        id: 1,
        name: 'Morgan Lee',
        email: 'Morgan.Lee@example.com',
        phone: '+1 555 0100',
        membershipType: 'Community',
        createdAt: response.body.data.createdAt,
      },
      error: null,
    });
    assert.equal(typeof response.body.data.createdAt, 'string');
  });
});

test('POST /api/members validates required fields and email, rejecting extra database fields', async () => {
  await withIsolatedApp(async (client) => {
    const missing = await client.post('/api/members').send({});
    const invalidEmail = await client.post('/api/members').send({
      ...validMember,
      email: 'not-an-email',
    });
    const suppliedId = await client.post('/api/members').send({ ...validMember, id: 50 });

    assert.equal(missing.status, 400);
    assert.deepEqual(
      missing.body.error.details.map(({ field }) => field).sort(),
      ['email', 'membershipType', 'name', 'phone'],
    );
    assert.equal(invalidEmail.status, 400);
    assert.ok(invalidEmail.body.error.details.some(({ field }) => field === 'email'));
    assert.equal(suppliedId.status, 400);
    assert.ok(suppliedId.body.error.details.some(({ field }) => field === 'id'));
  });
});

test('POST /api/members returns 409 for a duplicate email', async () => {
  await withIsolatedApp(async (client) => {
    const first = await client.post('/api/members').send(validMember);
    const duplicate = await client.post('/api/members').send({
      ...validMember,
      name: 'Another Member',
    });

    assert.equal(first.status, 201);
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error.message, 'A member with this email already exists.');
  });
});

test('GET /api/members returns an empty list with default pagination', async () => {
  await withIsolatedApp(async (client) => {
    const response = await client.get('/api/members');

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data, {
      members: [],
      pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 0 },
    });
  });
});

test('GET /api/members paginates results and sorts in both directions', async () => {
  await withIsolatedApp(async (client) => {
    await seedMembers(client, [
      memberFixture(1, { name: 'Morgan' }),
      memberFixture(2, { name: 'Avery' }),
      memberFixture(3, { name: 'Jordan' }),
    ]);

    const ascending = await client.get('/api/members').query({ sortBy: 'name', order: 'ASC' });
    const descending = await client.get('/api/members').query({ sortBy: 'name', order: 'desc' });
    const page = await client.get('/api/members').query({ page: 2, limit: 1, sortBy: 'name' });

    assert.deepEqual(ascending.body.data.members.map(({ name }) => name), ['Avery', 'Jordan', 'Morgan']);
    assert.deepEqual(descending.body.data.members.map(({ name }) => name), ['Morgan', 'Jordan', 'Avery']);
    assert.deepEqual(page.body.data.members.map(({ name }) => name), ['Jordan']);
    assert.deepEqual(page.body.data.pagination, {
      page: 2, limit: 1, totalItems: 3, totalPages: 3,
    });
  });
});

test('GET /api/members validates pagination and sorting options', async () => {
  await withIsolatedApp(async (client) => {
    const invalidQueries = [
      { query: { page: 0 }, field: 'page' },
      { query: { limit: -1 }, field: 'limit' },
      { query: { sortBy: 'created_at' }, field: 'sortBy' },
      { query: { order: 'sideways' }, field: 'order' },
    ];

    for (const { query, field } of invalidQueries) {
      const response = await client.get('/api/members').query(query);
      assert.equal(response.status, 400);
      assert.ok(response.body.error.details.some((detail) => detail.field === field));
    }
  });
});

test('GET /api/members/:id returns a member, validates IDs, and handles missing records', async () => {
  await withIsolatedApp(async (client) => {
    const created = await client.post('/api/members').send(validMember);
    const found = await client.get(`/api/members/${created.body.data.id}`);
    const invalid = await client.get('/api/members/not-an-id');
    const missing = await client.get('/api/members/999');

    assert.equal(found.status, 200);
    assert.deepEqual(found.body.data, created.body.data);
    assert.equal(invalid.status, 400);
    assert.ok(invalid.body.error.details.some(({ field }) => field === 'id'));
    assert.equal(missing.status, 404);
  });
});

test('PUT /api/members/:id updates supplied fields and rejects invalid or database-managed fields', async () => {
  await withIsolatedApp(async (client) => {
    const created = await client.post('/api/members').send(validMember);
    const updated = await client.put(`/api/members/${created.body.data.id}`).send({
      name: '  Morgan Changed ',
      phone: '  555-0199  ',
    });
    const empty = await client.put(`/api/members/${created.body.data.id}`).send({});
    const invalid = await client.put(`/api/members/${created.body.data.id}`).send({ email: 'bad' });
    const suppliedId = await client.put(`/api/members/${created.body.data.id}`).send({ id: 2 });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.name, 'Morgan Changed');
    assert.equal(updated.body.data.phone, '555-0199');
    assert.equal(updated.body.data.email, 'Morgan.Lee@example.com');
    assert.equal(empty.status, 400);
    assert.equal(invalid.status, 400);
    assert.ok(invalid.body.error.details.some(({ field }) => field === 'email'));
    assert.equal(suppliedId.status, 400);
    assert.ok(suppliedId.body.error.details.some(({ field }) => field === 'id'));
  });
});

test('PUT /api/members/:id returns 404 when missing and 409 for another member’s email', async () => {
  await withIsolatedApp(async (client) => {
    const first = await client.post('/api/members').send(validMember);
    const second = await client.post('/api/members').send(memberFixture(2));
    const missing = await client.put('/api/members/999').send({ name: 'Missing' });
    const conflict = await client.put(`/api/members/${second.body.data.id}`).send({
      email: first.body.data.email,
    });

    assert.equal(missing.status, 404);
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.error.message, 'A member with this email already exists.');
  });
});

test('PUT /api/members/:id validates the ID', async () => {
  await withIsolatedApp(async (client) => {
    const response = await client.put('/api/members/0').send({ name: 'Valid Name' });

    assert.equal(response.status, 400);
    assert.ok(response.body.error.details.some(({ field }) => field === 'id'));
  });
});

test('DELETE /api/members/:id returns an empty 204 response on success', async () => {
  await withIsolatedApp(async (client) => {
    const created = await client.post('/api/members').send(validMember);
    const response = await client.delete(`/api/members/${created.body.data.id}`);

    assert.equal(response.status, 204);
    assert.equal(response.text, '');
  });
});

test('DELETE /api/members/:id returns 404 for missing members and validates IDs', async () => {
  await withIsolatedApp(async (client) => {
    const missing = await client.delete('/api/members/999');
    const invalid = await client.delete('/api/members/-1');

    assert.equal(missing.status, 404);
    assert.equal(invalid.status, 400);
    assert.ok(invalid.body.error.details.some(({ field }) => field === 'id'));
  });
});

test('DELETE /api/members/:id returns 409 and preserves members with loan history', async () => {
  await withIsolatedApp(async (client, database) => {
    const member = await client.post('/api/members').send(validMember);
    const book = await database.run(
      `INSERT INTO books (title, author, isbn, category, copies_total, copies_available)
       VALUES (?, ?, ?, ?, ?, ?)`,
      'Reference Book',
      'Test Author',
      '978-0000000001',
      'Reference',
      1,
      1,
    );
    await database.run(
      `INSERT INTO loans (book_id, member_id, loan_date, due_date, return_date, status)
       VALUES (?, ?, date('now'), '2999-12-31', date('now'), 'returned')`,
      book.lastID,
      member.body.data.id,
    );

    const response = await client.delete(`/api/members/${member.body.data.id}`);
    const stillExists = await client.get(`/api/members/${member.body.data.id}`);
    const loanHistory = await database.all(
      'SELECT id FROM loans WHERE member_id = ?',
      member.body.data.id,
    );

    assert.equal(response.status, 409);
    assert.match(response.body.error.message, /loan records reference them/);
    assert.equal(stillExists.status, 200);
    assert.equal(loanHistory.length, 1);
  });
});
