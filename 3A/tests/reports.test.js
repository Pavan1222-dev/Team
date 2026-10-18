import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createReportsRepository } from '../src/repositories/reports.repository.js';
import { createReportsService } from '../src/services/reports.service.js';
import { validateHierarchyEmployeeId } from '../src/validators/reports.validator.js';

function validatorResult(request) {
  return new Promise((resolve, reject) => {
    validateHierarchyEmployeeId(request, {}, (error) => (
      error ? reject(error) : resolve(request.validated)
    ));
  });
}

test('reports repository uses aggregate join, current-date approved leave, and parameterized recursive ID', async () => {
  const calls = [];
  const database = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (sql.includes('WITH RECURSIVE')) {
        return { rows: [{ id: '4', first_name: 'Sam', last_name: 'Lee', email: 'sam@example.test', department_id: '2', department_name: 'Product', manager_id: null, joining_date: '2024-01-01', level: 0 }] };
      }
      if (sql.includes('COUNT(e.id)')) return { rows: [{ id: '2', name: 'Product', description: null, employee_count: 0 }] };
      return { rows: [{ id: '4', first_name: 'Sam', last_name: 'Lee', email: 'sam@example.test', department_id: '2', department_name: 'Product', manager_id: null, joining_date: '2024-01-01', leave_start_date: '2026-06-01', leave_end_date: '2026-06-02', leave_reason: 'Rest' }] };
    },
  };
  const repository = createReportsRepository(database);
  const service = createReportsService(repository);

  assert.deepEqual(await service.departmentHeadcount(), [{ id: '2', name: 'Product', description: null, employeeCount: 0 }]);
  assert.equal((await service.employeesOnLeaveToday())[0].leave.reason, 'Rest');
  const hierarchy = await service.managerHierarchy('4');
  assert.equal(hierarchy[0].level, 0);
  assert.ok(calls[0].sql.includes('LEFT JOIN employees'));
  assert.match(calls[1].sql, /status = 'APPROVED'[\s\S]*CURRENT_DATE/);
  assert.match(calls[2].sql, /WITH RECURSIVE[\s\S]*visited_ids/);
  assert.deepEqual(calls[2].values, ['4']);
});

test('hierarchy validator accepts positive IDs and rejects malformed IDs', async () => {
  assert.deepEqual(await validatorResult({ params: { id: '42' } }), { id: '42' });
  await assert.rejects(validatorResult({ params: { id: '0' } }), { status: 400 });
});
