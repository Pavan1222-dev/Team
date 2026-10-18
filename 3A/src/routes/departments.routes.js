import { Router } from 'express';
import { createDepartmentsController } from '../controllers/departments.controller.js';
import { createDepartmentsRepository } from '../repositories/departments.repository.js';
import { createDepartmentsService } from '../services/departments.service.js';
import {
  validateCreateDepartment,
  validateDepartmentId,
  validateListDepartments,
  validateUpdateDepartment,
} from '../validators/department.validator.js';

export function createDepartmentsRouter(database) {
  const router = Router();
  const repository = createDepartmentsRepository(database);
  const service = createDepartmentsService(repository);
  const controller = createDepartmentsController(service);

  router.post('/', validateCreateDepartment, controller.create);
  router.get('/', validateListDepartments, controller.list);
  router.get('/:id', validateDepartmentId, controller.get);
  router.put('/:id', validateUpdateDepartment, controller.update);
  router.delete('/:id', validateDepartmentId, controller.delete);
  return router;
}
