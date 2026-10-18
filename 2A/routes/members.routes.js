import { Router } from 'express';
import { createMembersController } from '../controllers/members.controller.js';
import { createMembersRepository } from '../repositories/members.repository.js';
import { createMembersService } from '../services/members.service.js';
import {
  validateCreateMember,
  validateListMembers,
  validateMemberId,
  validateUpdateMember,
} from '../validators/members.validator.js';

export function createMembersRouter(database) {
  const router = Router();
  const repository = createMembersRepository(database);
  const service = createMembersService(repository);
  const controller = createMembersController(service);

  router.get('/members', validateListMembers, controller.listMembers);
  router.get('/members/:id', validateMemberId, controller.getMember);
  router.post('/members', validateCreateMember, controller.createMember);
  router.put('/members/:id', validateMemberId, validateUpdateMember, controller.updateMember);
  router.delete('/members/:id', validateMemberId, controller.deleteMember);

  return router;
}
