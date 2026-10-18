export class LeaveServiceError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'LeaveServiceError';
    this.status = status;
  }
}

function requireId(value, field) {
  const isPositiveInteger = (typeof value === 'number' && Number.isSafeInteger(value) && value > 0)
    || (typeof value === 'string' && /^[1-9]\d*$/.test(value));
  if (!isPositiveInteger) {
    throw new LeaveServiceError(`${field} must be a positive integer.`, 400);
  }
}

function parseCalendarDate(value, field) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new LeaveServiceError(`${field} must be a valid date in YYYY-MM-DD format.`, 400);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new LeaveServiceError(`${field} must be a valid date in YYYY-MM-DD format.`, 400);
  }

  return date;
}

export function calculateLeaveDurationDays(startDate, endDate) {
  const start = parseCalendarDate(startDate, 'startDate');
  const end = parseCalendarDate(endDate, 'endDate');
  const durationDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;

  if (durationDays < 1) {
    throw new LeaveServiceError('endDate must be on or after startDate.', 400);
  }

  return durationDays;
}

function validateRequest({ employeeId, startDate, endDate, reason }) {
  requireId(employeeId, 'employeeId');
  const durationDays = calculateLeaveDurationDays(startDate, endDate);
  if (typeof reason !== 'string' || reason.trim().length === 0) {
    throw new LeaveServiceError('reason must be a non-empty string.', 400);
  }
  return { durationDays, reason: reason.trim() };
}

function validateReviewIds(leaveRequestId, reviewerId) {
  requireId(leaveRequestId, 'leaveRequestId');
  requireId(reviewerId, 'reviewerId');
}

async function inTransaction(pool, operation) {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    if (transactionStarted) {
      await client.query('ROLLBACK').catch(() => {});
    }
    throw error;
  } finally {
    client.release();
  }
}

function mapLeaveRequest(row, extra = {}) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    startDate: row.start_date,
    endDate: row.end_date,
    durationDays: Number(row.duration_days),
    reason: row.reason,
    status: row.status,
    reviewerId: row.reviewer_id,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...extra,
  };
}

async function lockPendingRequest(client, leaveRequestId) {
  const result = await client.query(
    `SELECT id, employee_id, start_date::text AS start_date,
            end_date::text AS end_date,
            (end_date - start_date + 1)::integer AS duration_days,
            reason, status, reviewer_id, reviewed_at, created_at, updated_at
     FROM leave_requests
     WHERE id = $1
     FOR UPDATE`,
    [leaveRequestId],
  );
  const request = result.rows[0];

  if (!request) {
    throw new LeaveServiceError('Leave request not found.', 404);
  }
  if (request.status !== 'PENDING') {
    throw new LeaveServiceError('Only pending leave requests can be reviewed.', 409);
  }

  return request;
}

async function lockEmployeeAndAuthorize(client, employeeId, reviewerId) {
  const result = await client.query(
    `SELECT id, manager_id, leave_balance_days
     FROM employees
     WHERE id = $1
     FOR UPDATE`,
    [employeeId],
  );
  const employee = result.rows[0];

  if (!employee) {
    throw new LeaveServiceError('Employee not found.', 404);
  }
  if (String(employee.manager_id) !== String(reviewerId)) {
    throw new LeaveServiceError('Only the employee’s manager can review this leave request.', 403);
  }

  return employee;
}

export function createLeaveService(pool) {
  if (!pool || typeof pool.connect !== 'function') {
    throw new TypeError('A PostgreSQL pool is required to create the leave service.');
  }

  return {
    async createPendingRequest(input) {
      const { durationDays, reason } = validateRequest(input);

      return inTransaction(pool, async (client) => {
        const employee = await client.query(
          'SELECT id FROM employees WHERE id = $1 FOR KEY SHARE',
          [input.employeeId],
        );
        if (employee.rowCount === 0) {
          throw new LeaveServiceError('Employee not found.', 404);
        }

        const result = await client.query(
          `INSERT INTO leave_requests (employee_id, start_date, end_date, reason, status)
           VALUES ($1, $2::date, $3::date, $4, 'PENDING')
           RETURNING id, employee_id, start_date::text AS start_date,
                     end_date::text AS end_date,
                     (end_date - start_date + 1)::integer AS duration_days,
                     reason, status, reviewer_id, reviewed_at, created_at, updated_at`,
          [input.employeeId, input.startDate, input.endDate, reason],
        );

        return mapLeaveRequest(result.rows[0], { durationDays });
      });
    },

    async approveRequest({ leaveRequestId, reviewerId }) {
      validateReviewIds(leaveRequestId, reviewerId);

      return inTransaction(pool, async (client) => {
        const request = await lockPendingRequest(client, leaveRequestId);

        // Serializes approvals for this employee before balance and overlap checks.
        const employee = await lockEmployeeAndAuthorize(client, request.employee_id, reviewerId);
        const durationDays = Number(request.duration_days);
        if (Number(employee.leave_balance_days) < durationDays) {
          throw new LeaveServiceError('Insufficient leave balance.', 409);
        }

        const overlapping = await client.query(
          `SELECT id
           FROM leave_requests
           WHERE employee_id = $1
             AND status = 'APPROVED'
             AND id <> $2
             AND start_date <= $4::date
             AND end_date >= $3::date
           LIMIT 1`,
          [request.employee_id, leaveRequestId, request.start_date, request.end_date],
        );
        if (overlapping.rowCount > 0) {
          throw new LeaveServiceError('Leave request overlaps approved leave.', 409);
        }

        const balanceUpdate = await client.query(
          `UPDATE employees
           SET leave_balance_days = leave_balance_days - $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND leave_balance_days >= $1
           RETURNING leave_balance_days`,
          [durationDays, request.employee_id],
        );
        if (balanceUpdate.rowCount !== 1) {
          throw new LeaveServiceError('Insufficient leave balance.', 409);
        }

        const approval = await client.query(
          `UPDATE leave_requests
           SET status = 'APPROVED', reviewer_id = $1,
               reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND status = 'PENDING'
           RETURNING id, employee_id, start_date::text AS start_date,
                     end_date::text AS end_date,
                     (end_date - start_date + 1)::integer AS duration_days,
                     reason, status, reviewer_id, reviewed_at, created_at, updated_at`,
          [reviewerId, leaveRequestId],
        );
        if (approval.rowCount !== 1) {
          throw new LeaveServiceError('Only pending leave requests can be reviewed.', 409);
        }

        return mapLeaveRequest(approval.rows[0], {
          remainingLeaveBalanceDays: balanceUpdate.rows[0].leave_balance_days,
        });
      });
    },

    async rejectRequest({ leaveRequestId, reviewerId }) {
      validateReviewIds(leaveRequestId, reviewerId);

      return inTransaction(pool, async (client) => {
        const request = await lockPendingRequest(client, leaveRequestId);
        await lockEmployeeAndAuthorize(client, request.employee_id, reviewerId);

        const rejection = await client.query(
          `UPDATE leave_requests
           SET status = 'REJECTED', reviewer_id = $1,
               reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND status = 'PENDING'
           RETURNING id, employee_id, start_date::text AS start_date,
                     end_date::text AS end_date,
                     (end_date - start_date + 1)::integer AS duration_days,
                     reason, status, reviewer_id, reviewed_at, created_at, updated_at`,
          [reviewerId, leaveRequestId],
        );
        if (rejection.rowCount !== 1) {
          throw new LeaveServiceError('Only pending leave requests can be reviewed.', 409);
        }

        return mapLeaveRequest(rejection.rows[0]);
      });
    },
  };
}
