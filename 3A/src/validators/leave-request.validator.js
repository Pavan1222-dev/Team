import { HttpError } from '../middleware/error-handler.js';
import {
  pagination,
  optionalDate,
  positiveId,
  rejectUnknownKeys,
  requiredText,
  requireObject,
  sorting,
  validateWith,
} from './shared.js';

const statuses = ['PENDING', 'APPROVED', 'REJECTED'];

export const validateCreateLeaveRequest = validateWith((request) => {
  const body = requireObject(request.body, 'Request body');
  rejectUnknownKeys(body, ['employeeId', 'startDate', 'endDate', 'reason'], 'leave request');
  const employeeId = positiveId(body.employeeId, 'employeeId');
  const startDate = optionalDate(body.startDate, 'startDate');
  const endDate = optionalDate(body.endDate, 'endDate');
  if (!startDate || !endDate) throw new HttpError(400, 'startDate and endDate are required.');
  if (endDate < startDate) throw new HttpError(400, 'endDate must be on or after startDate.');
  const reason = requiredText(body.reason, 'reason');
  return { employeeId, startDate, endDate, reason };
});

export const validateLeaveRequestId = validateWith((request) => ({
  id: positiveId(request.params.id, 'id'),
}));

export const validateReviewLeaveRequest = validateWith((request) => {
  const body = requireObject(request.body, 'Request body');
  rejectUnknownKeys(body, ['reviewerId'], 'review');
  return {
    id: positiveId(request.params.id, 'id'),
    reviewerId: positiveId(body.reviewerId, 'reviewerId'),
  };
});

export const validateListLeaveRequests = validateWith((request) => {
  const { page, limit, offset } = pagination(request.query);
  const { sortBy, order } = sorting(request.query, ['startDate', 'endDate', 'createdAt', 'status'], 'createdAt');
  const employeeId = request.query.employeeId === undefined
    ? undefined
    : positiveId(request.query.employeeId, 'employeeId');
  const status = request.query.status === undefined
    ? undefined
    : String(request.query.status).toUpperCase();
  if (status !== undefined && !statuses.includes(status)) {
    throw new HttpError(400, `status must be one of: ${statuses.join(', ')}.`);
  }
  const startDateFrom = optionalDate(request.query.startDateFrom, 'startDateFrom');
  const startDateTo = optionalDate(request.query.startDateTo, 'startDateTo');
  if (startDateFrom && startDateTo && startDateFrom > startDateTo) {
    throw new HttpError(400, 'startDateFrom must be on or before startDateTo.');
  }
  return { page, limit, offset, sortBy, order, employeeId, status, startDateFrom, startDateTo };
});
