import { HttpError } from '../middleware/error-handler.js';

function toLeaveRequest(row) {
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
  };
}

export function createLeaveRequestsService(workflow, repository) {
  return {
    create: (fields) => workflow.createPendingRequest(fields),
    async get(id) {
      const row = await repository.getById(id);
      if (!row) throw new HttpError(404, 'Leave request not found.');
      return toLeaveRequest(row);
    },
    async list(filters) {
      const result = await repository.list(filters);
      return {
        items: result.rows.map(toLeaveRequest),
        pagination: {
          page: result.page,
          limit: result.limit,
          totalItems: result.totalItems,
          totalPages: Math.ceil(result.totalItems / result.limit),
        },
      };
    },
    approve: (id, reviewerId) => workflow.approveRequest({ leaveRequestId: id, reviewerId }),
    reject: (id, reviewerId) => workflow.rejectRequest({ leaveRequestId: id, reviewerId }),
  };
}
