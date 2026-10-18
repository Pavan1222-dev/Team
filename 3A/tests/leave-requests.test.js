import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  validateCreateLeaveRequest,
  validateLeaveRequestId,
  validateListLeaveRequests,
  validateReviewLeaveRequest,
} from '../src/validators/leave-request.validator.js';

function validate(middleware, request) {
  return new Promise((resolve, reject) => {
    middleware(request, {}, (error) => (error ? reject(error) : resolve(request.validated)));
  });
}

test('leave request validators normalize valid create and review inputs', async () => {
  const create = await validate(validateCreateLeaveRequest, {
    body: { employeeId: '12', startDate: '2026-06-01', endDate: '2026-06-02', reason: '  Rest  ' },
  });
  assert.deepEqual(create, {
    employeeId: '12', startDate: '2026-06-01', endDate: '2026-06-02', reason: 'Rest',
  });
  assert.deepEqual(await validate(validateReviewLeaveRequest, {
    params: { id: '4' }, body: { reviewerId: '2' },
  }), { id: '4', reviewerId: '2' });
});

test('leave request validators reject missing fields, invalid dates, IDs, statuses and extra fields', async () => {
  await assert.rejects(validate(validateCreateLeaveRequest, { body: { employeeId: 1 } }), { status: 400 });
  await assert.rejects(validate(validateCreateLeaveRequest, {
    body: { employeeId: 1, startDate: '2026-02-30', endDate: '2026-03-01', reason: 'Leave' },
  }), { status: 400 });
  await assert.rejects(validate(validateCreateLeaveRequest, {
    body: { employeeId: 1, startDate: '2026-06-02', endDate: '2026-06-01', reason: 'Leave' },
  }), { status: 400 });
  await assert.rejects(validate(validateLeaveRequestId, { params: { id: '0' } }), { status: 400 });
  await assert.rejects(validate(validateReviewLeaveRequest, { params: { id: '1' }, body: {} }), { status: 400 });
  await assert.rejects(validate(validateCreateLeaveRequest, {
    body: { employeeId: 1, startDate: '2026-06-01', endDate: '2026-06-01', reason: 'Leave', status: 'APPROVED' },
  }), { status: 400 });
  await assert.rejects(validate(validateListLeaveRequests, { query: { status: 'UNKNOWN' } }), { status: 400 });
});

test('leave request listing validates filters and returns defaults', async () => {
  assert.deepEqual(await validate(validateListLeaveRequests, { query: {} }), {
    page: 1, limit: 10, offset: 0, sortBy: 'createdAt', order: 'asc',
    employeeId: undefined, status: undefined, startDateFrom: undefined, startDateTo: undefined,
  });
  await assert.rejects(validate(validateListLeaveRequests, { query: { startDateFrom: '2026-06-03', startDateTo: '2026-06-01' } }), { status: 400 });
  await assert.rejects(validate(validateListLeaveRequests, { query: { sortBy: 'employeeId' } }), { status: 400 });
});
