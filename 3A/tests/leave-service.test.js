import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  calculateLeaveDurationDays,
  createLeaveService,
} from '../src/services/leave-service.js';

function duration(start, end) {
  return Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;
}

function cloneMap(source) {
  return new Map([...source].map(([id, row]) => [id, { ...row }]));
}

class FakeLeavePool {
  constructor({ balance = 10, managerId = 1 } = {}) {
    this.employees = new Map([
      [1, { id: 1, manager_id: null, leave_balance_days: String(balance) }],
      [2, { id: 2, manager_id: managerId, leave_balance_days: String(balance) }],
      [3, { id: 3, manager_id: null, leave_balance_days: '10' }],
    ]);
    this.requests = new Map();
    this.nextRequestId = 1;
    this.transactionTail = Promise.resolve();
    this.trace = [];
    this.failApprovalUpdate = false;
  }

  async acquireTransaction() {
    const previous = this.transactionTail;
    let release;
    this.transactionTail = new Promise((resolve) => { release = resolve; });
    await previous;
    return release;
  }

  async connect() {
    return new FakeLeaveClient(this);
  }

  snapshot() {
    return {
      employees: cloneMap(this.employees),
      requests: cloneMap(this.requests),
      nextRequestId: this.nextRequestId,
    };
  }

  restore(snapshot) {
    this.employees = snapshot.employees;
    this.requests = snapshot.requests;
    this.nextRequestId = snapshot.nextRequestId;
  }
}

class FakeLeaveClient {
  constructor(database) {
    this.database = database;
    this.releaseTransaction = null;
    this.transactionSnapshot = null;
  }

  async query(sql, values = []) {
    const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();
    this.database.trace.push({ sql: normalized, values });

    if (normalized === 'begin') {
      this.releaseTransaction = await this.database.acquireTransaction();
      this.transactionSnapshot = this.database.snapshot();
      return { rows: [], rowCount: null };
    }
    if (normalized === 'commit') {
      this.finishTransaction();
      return { rows: [], rowCount: null };
    }
    if (normalized === 'rollback') {
      this.database.restore(this.transactionSnapshot);
      this.finishTransaction();
      return { rows: [], rowCount: null };
    }
    if (normalized.includes('from employees where id = $1 for key share')) {
      return this.rows(this.database.employees.get(Number(values[0])) ?? null);
    }
    if (normalized.includes('from leave_requests') && normalized.includes('where id = $1 for update')) {
      const row = this.database.requests.get(Number(values[0]));
      if (!row) return this.rows(null);
      return this.rows({ ...row, duration_days: duration(row.start_date, row.end_date) });
    }
    if (normalized.includes('from employees') && normalized.includes('where id = $1 for update')) {
      return this.rows(this.database.employees.get(Number(values[0])) ?? null);
    }
    if (normalized.startsWith('insert into leave_requests')) {
      const [employeeId, startDate, endDate, reason] = values;
      const id = this.database.nextRequestId++;
      const row = {
        id,
        employee_id: Number(employeeId),
        start_date: startDate,
        end_date: endDate,
        reason,
        status: 'PENDING',
        reviewer_id: null,
        reviewed_at: null,
        created_at: 'created',
        updated_at: 'created',
      };
      this.database.requests.set(id, row);
      return this.rows({ ...row, duration_days: duration(startDate, endDate) });
    }
    if (normalized.startsWith('select id from leave_requests')) {
      const [employeeId, requestId, startDate, endDate] = values;
      const overlap = [...this.database.requests.values()].find((row) => (
        row.employee_id === Number(employeeId)
        && row.id !== Number(requestId)
        && row.status === 'APPROVED'
        && row.start_date <= endDate
        && row.end_date >= startDate
      ));
      return this.rows(overlap ? { id: overlap.id } : null);
    }
    if (normalized.startsWith('update employees')) {
      const [days, employeeId] = values;
      const employee = this.database.employees.get(Number(employeeId));
      if (!employee || Number(employee.leave_balance_days) < Number(days)) {
        return this.rows(null);
      }
      employee.leave_balance_days = String(Number(employee.leave_balance_days) - Number(days));
      return this.rows({ leave_balance_days: employee.leave_balance_days });
    }
    if (normalized.startsWith('update leave_requests')) {
      if (this.database.failApprovalUpdate && normalized.includes("status = 'approved'")) {
        throw new Error('Forced leave status update failure.');
      }
      const [reviewerId, requestId] = values;
      const row = this.database.requests.get(Number(requestId));
      if (!row || row.status !== 'PENDING') return this.rows(null);
      row.status = normalized.includes("status = 'approved'") ? 'APPROVED' : 'REJECTED';
      row.reviewer_id = Number(reviewerId);
      row.reviewed_at = 'reviewed';
      row.updated_at = 'reviewed';
      return this.rows({ ...row, duration_days: duration(row.start_date, row.end_date) });
    }

    throw new Error(`Unexpected SQL in leave-service unit test: ${normalized}`);
  }

  rows(row) {
    return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
  }

  finishTransaction() {
    const release = this.releaseTransaction;
    this.releaseTransaction = null;
    this.transactionSnapshot = null;
    release?.();
  }

  release() {
    this.finishTransaction();
  }
}

async function createPending(service, fields = {}) {
  return service.createPendingRequest({
    employeeId: 2,
    startDate: '2026-06-10',
    endDate: '2026-06-12',
    reason: 'Annual leave',
    ...fields,
  });
}

async function expectStatus(operation, status, messagePart) {
  await assert.rejects(operation, (error) => {
    assert.equal(error.status, status);
    if (messagePart) assert.match(error.message, new RegExp(messagePart));
    return true;
  });
}

test('leave duration counts both calendar dates and pending creation does not deduct balance', async () => {
  assert.equal(calculateLeaveDurationDays('2026-06-10', '2026-06-12'), 3);
  assert.equal(calculateLeaveDurationDays('2024-02-28', '2024-03-01'), 3);
  const database = new FakeLeavePool({ balance: 10 });
  const service = createLeaveService(database);

  const request = await createPending(service, { startDate: '2026-06-10', endDate: '2026-06-12' });

  assert.equal(request.durationDays, 3);
  assert.equal(request.status, 'PENDING');
  assert.equal(database.employees.get(2).leave_balance_days, '10');
});

test('approval rejects a reviewer who is not the employee manager', async () => {
  const database = new FakeLeavePool({ managerId: 1 });
  const service = createLeaveService(database);
  const request = await createPending(service);

  await expectStatus(service.approveRequest({ leaveRequestId: request.id, reviewerId: 3 }), 403, 'manager');

  assert.equal(database.requests.get(request.id).status, 'PENDING');
  assert.equal(database.employees.get(2).leave_balance_days, '10');
  assert.ok(database.trace.some(({ sql }) => sql.includes('where id = $1 for update')));
});

test('approval checks the locked employee balance before deduction', async () => {
  const database = new FakeLeavePool({ balance: 2 });
  const service = createLeaveService(database);
  const request = await createPending(service);

  await expectStatus(service.approveRequest({ leaveRequestId: request.id, reviewerId: 1 }), 409, 'balance');

  assert.equal(database.employees.get(2).leave_balance_days, '2');
  assert.equal(database.requests.get(request.id).status, 'PENDING');
  const employeeLock = database.trace.findIndex(({ sql }) => sql.includes('from employees') && sql.includes('for update'));
  assert.ok(employeeLock >= 0);
});

test('approval rejects overlaps at inclusive date boundaries', async () => {
  const database = new FakeLeavePool();
  const service = createLeaveService(database);
  const approved = await createPending(service, {
    startDate: '2026-06-10', endDate: '2026-06-12',
  });
  await service.approveRequest({ leaveRequestId: approved.id, reviewerId: 1 });
  const touching = await createPending(service, {
    startDate: '2026-06-12', endDate: '2026-06-14',
  });

  await expectStatus(service.approveRequest({ leaveRequestId: touching.id, reviewerId: 1 }), 409, 'overlaps');

  assert.equal(database.requests.get(touching.id).status, 'PENDING');
  assert.equal(database.employees.get(2).leave_balance_days, '7');
});

test('duplicate approval cannot deduct leave balance twice', async () => {
  const database = new FakeLeavePool();
  const service = createLeaveService(database);
  const request = await createPending(service);
  await service.approveRequest({ leaveRequestId: request.id, reviewerId: 1 });

  await expectStatus(service.approveRequest({ leaveRequestId: request.id, reviewerId: 1 }), 409, 'pending');

  assert.equal(database.employees.get(2).leave_balance_days, '7');
});

test('manager rejection updates the request without changing leave balance', async () => {
  const database = new FakeLeavePool();
  const service = createLeaveService(database);
  const request = await createPending(service);

  const rejected = await service.rejectRequest({ leaveRequestId: request.id, reviewerId: 1 });

  assert.equal(rejected.status, 'REJECTED');
  assert.equal(rejected.reviewerId, 1);
  assert.equal(database.employees.get(2).leave_balance_days, '10');
});

test('approval failure after the balance update rolls the whole transaction back', async () => {
  const database = new FakeLeavePool();
  const service = createLeaveService(database);
  const request = await createPending(service);
  database.failApprovalUpdate = true;

  await assert.rejects(
    service.approveRequest({ leaveRequestId: request.id, reviewerId: 1 }),
    /Forced leave status update failure/,
  );

  assert.equal(database.employees.get(2).leave_balance_days, '10');
  assert.equal(database.requests.get(request.id).status, 'PENDING');
  assert.ok(database.trace.some(({ sql }) => sql === 'rollback'));
});

test('concurrent overlapping approvals serialize on the employee row', async () => {
  const database = new FakeLeavePool({ balance: 10 });
  const service = createLeaveService(database);
  const first = await createPending(service, { startDate: '2026-07-01', endDate: '2026-07-02' });
  const second = await createPending(service, { startDate: '2026-07-02', endDate: '2026-07-03' });

  const results = await Promise.allSettled([
    service.approveRequest({ leaveRequestId: first.id, reviewerId: 1 }),
    service.approveRequest({ leaveRequestId: second.id, reviewerId: 1 }),
  ]);

  assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1);
  const failure = results.find(({ status }) => status === 'rejected');
  assert.equal(failure.reason.status, 409);
  assert.match(failure.reason.message, /overlaps approved leave/);
  assert.equal([...database.requests.values()].filter(({ status }) => status === 'APPROVED').length, 1);
  assert.equal(database.employees.get(2).leave_balance_days, '8');
});

test('leave service rejects invalid date ranges before opening a transaction', async () => {
  const database = new FakeLeavePool();
  const service = createLeaveService(database);

  await expectStatus(
    service.createPendingRequest({
      employeeId: 2,
      startDate: '2026-02-30',
      endDate: '2026-03-01',
      reason: 'Invalid dates',
    }),
    400,
    'valid date',
  );
  assert.equal(database.trace.length, 0);
});

test('leave service accepts PostgreSQL BIGINT identifiers returned as decimal strings', async () => {
  const database = new FakeLeavePool();
  const service = createLeaveService(database);
  const request = await createPending(service, { employeeId: '2' });

  assert.equal(request.employeeId, 2);
  await service.approveRequest({ leaveRequestId: String(request.id), reviewerId: '1' });
  assert.equal(database.requests.get(request.id).status, 'APPROVED');
});
