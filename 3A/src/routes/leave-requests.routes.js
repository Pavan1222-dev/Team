import { Router } from 'express';
import { createLeaveRequestsController } from '../controllers/leave-requests.controller.js';
import { createLeaveRequestsRepository } from '../repositories/leave-requests.repository.js';
import { createLeaveService } from '../services/leave-service.js';
import { createLeaveRequestsService } from '../services/leave-requests.service.js';
import {
  validateCreateLeaveRequest,
  validateLeaveRequestId,
  validateListLeaveRequests,
  validateReviewLeaveRequest,
} from '../validators/leave-request.validator.js';

export function createLeaveRequestsRouter(database) {
  const router = Router();
  const workflow = createLeaveService(database);
  const repository = createLeaveRequestsRepository(database);
  const service = createLeaveRequestsService(workflow, repository);
  const controller = createLeaveRequestsController(service);

  router.post('/', validateCreateLeaveRequest, controller.create);
  router.get('/', validateListLeaveRequests, controller.list);
  router.get('/:id', validateLeaveRequestId, controller.get);
  router.patch('/:id/approve', validateReviewLeaveRequest, controller.approve);
  router.patch('/:id/reject', validateReviewLeaveRequest, controller.reject);
  return router;
}
