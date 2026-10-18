import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import pg from 'pg';
import { createLeaveService } from '../src/services/leave-service.js';

const { Pool } = pg;
const testDatabaseName = process.env.TEST_DB_NAME;
const developmentDatabaseName = process.env.DB_NAME;
const skipReason = !testDatabaseName
  ? 'Set TEST_DB_NAME to a dedicated isolated PostgreSQL test database.'
  : testDatabaseName === developmentDatabaseName
    ? 'TEST_DB_NAME must differ from DB_NAME; refusing to use the development database.'
    : false;

function testPoolOptions(searchPath) {
  return {
    host: process.env.TEST_DB_HOST || process.env.DB_HOST,
    port: Number(process.env.TEST_DB_PORT || process.env.DB_PORT),
    database: testDatabaseName,
    user: process.env.TEST_DB_USER || process.env.DB_USER,
    password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD,
    ...(searchPath ? { options: `-c search_path=${searchPath},public` } : {}),
  };
}

async function insertEmployee(pool, { managerId = null, balance = 10 } = {}) {
  const result = await pool.query(
    `INSERT INTO employees (manager_id, leave_balance_days)
     VALUES ($1, $2) RETURNING id`,
    [managerId, balance],
  );
  return result.rows[0].id;
}

test('leave service transactional behavior against an isolated PostgreSQL schema', { skip: skipReason }, async (context) => {
  const schema = `leave_test_${randomUUID().replaceAll('-', '')}`;
  const adminPool = new Pool(testPoolOptions());
  let schemaCreated = false;
  let servicePool;

  context.after(async () => {
    if (servicePool) await servicePool.end();
    if (schemaCreated) await adminPool.query(`DROP SCHEMA "${schema}" CASCADE`);
    await adminPool.end();
  });

  await adminPool.query(`CREATE SCHEMA "${schema}"`);
  schemaCreated = true;
  servicePool = new Pool(testPoolOptions(schema));
  await servicePool.query(`
    CREATE TABLE employees (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      manager_id BIGINT REFERENCES employees(id),
      leave_balance_days NUMERIC(6, 2) NOT NULL CHECK (leave_balance_days >= 0),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE leave_requests (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      employee_id BIGINT NOT NULL REFERENCES employees(id),
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      reason TEXT NOT NULL,
      status VARCHAR(10) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
      reviewer_id BIGINT REFERENCES employees(id),
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK (end_date >= start_date),
      CHECK (
        (status = 'PENDING' AND reviewer_id IS NULL AND reviewed_at IS NULL) OR
        (status IN ('APPROVED', 'REJECTED') AND reviewer_id IS NOT NULL AND reviewed_at IS NOT NULL)
      )
    );
  `);

  const service = createLeaveService(servicePool);
  const managerId = await insertEmployee(servicePool);
  const outsiderId = await insertEmployee(servicePool);
  const employeeId = await insertEmployee(servicePool, { managerId, balance: 10 });
  const pending = await service.createPendingRequest({
    employeeId,
    startDate: '2026-06-10',
    endDate: '2026-06-12',
    reason: 'Annual leave',
  });

  await assert.rejects(
    service.approveRequest({ leaveRequestId: pending.id, reviewerId: outsiderId }),
    { status: 403 },
  );
  const approved = await service.approveRequest({ leaveRequestId: pending.id, reviewerId: managerId });
  assert.equal(approved.durationDays, 3);
  assert.equal(approved.status, 'APPROVED');
  assert.equal(Number(approved.remainingLeaveBalanceDays), 7);
  await assert.rejects(
    service.approveRequest({ leaveRequestId: pending.id, reviewerId: managerId }),
    { status: 409 },
  );

  const overlapping = await service.createPendingRequest({
    employeeId,
    startDate: '2026-06-12',
    endDate: '2026-06-14',
    reason: 'Boundary overlap',
  });
  await assert.rejects(
    service.approveRequest({ leaveRequestId: overlapping.id, reviewerId: managerId }),
    { status: 409 },
  );

  const rejectedRequest = await service.createPendingRequest({
    employeeId,
    startDate: '2026-07-01',
    endDate: '2026-07-02',
    reason: 'No deduction on rejection',
  });
  await assert.rejects(
    service.rejectRequest({ leaveRequestId: rejectedRequest.id, reviewerId: outsiderId }),
    { status: 403 },
  );
  const rejected = await service.rejectRequest({
    leaveRequestId: rejectedRequest.id,
    reviewerId: managerId,
  });
  assert.equal(rejected.status, 'REJECTED');
  assert.equal(Number((await servicePool.query(
    'SELECT leave_balance_days FROM employees WHERE id = $1', [employeeId],
  )).rows[0].leave_balance_days), 7);

  const lowBalanceEmployeeId = await insertEmployee(servicePool, { managerId, balance: 1 });
  const tooLong = await service.createPendingRequest({
    employeeId: lowBalanceEmployeeId,
    startDate: '2026-08-01',
    endDate: '2026-08-02',
    reason: 'Exceeds balance',
  });
  await assert.rejects(
    service.approveRequest({ leaveRequestId: tooLong.id, reviewerId: managerId }),
    { status: 409 },
  );

  const rollbackRequest = await service.createPendingRequest({
    employeeId,
    startDate: '2026-09-01',
    endDate: '2026-09-02',
    reason: 'Rollback on failed request update',
  });
  await servicePool.query(`
    CREATE FUNCTION reject_approval_update() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.status = 'APPROVED' THEN RAISE EXCEPTION 'forced test failure'; END IF;
      RETURN NEW;
    END
    $$;
    CREATE TRIGGER reject_approval_update
    BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE FUNCTION reject_approval_update();
  `);
  await assert.rejects(
    service.approveRequest({ leaveRequestId: rollbackRequest.id, reviewerId: managerId }),
    /forced test failure/,
  );
  const rollbackState = await servicePool.query(
    `SELECT e.leave_balance_days, r.status
     FROM employees e JOIN leave_requests r ON r.employee_id = e.id
     WHERE e.id = $1 AND r.id = $2`,
    [employeeId, rollbackRequest.id],
  );
  assert.equal(Number(rollbackState.rows[0].leave_balance_days), 7);
  assert.equal(rollbackState.rows[0].status, 'PENDING');
  await servicePool.query('DROP TRIGGER reject_approval_update ON leave_requests');
  await servicePool.query('DROP FUNCTION reject_approval_update()');

  const concurrentEmployeeId = await insertEmployee(servicePool, { managerId, balance: 10 });
  const concurrentRequests = await Promise.all(['2026-10-01', '2026-10-01'].map((startDate) => (
    service.createPendingRequest({
      employeeId: concurrentEmployeeId,
      startDate,
      endDate: startDate,
      reason: 'Concurrent approval test',
    })
  )));
  const results = await Promise.allSettled(concurrentRequests.map(({ id }) => (
    service.approveRequest({ leaveRequestId: id, reviewerId: managerId })
  )));
  assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => (
    result.status === 'rejected' && result.reason?.status === 409
  )).length, 1);
  const concurrentState = await servicePool.query(
    `SELECT e.leave_balance_days,
            COUNT(*) FILTER (WHERE r.status = 'APPROVED') AS approved_count
     FROM employees e JOIN leave_requests r ON r.employee_id = e.id
     WHERE e.id = $1 GROUP BY e.leave_balance_days`,
    [concurrentEmployeeId],
  );
  assert.equal(Number(concurrentState.rows[0].leave_balance_days), 9);
  assert.equal(Number(concurrentState.rows[0].approved_count), 1);
});
