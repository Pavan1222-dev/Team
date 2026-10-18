import { Router } from 'express';
import { createEmployeesController } from '../controllers/employees.controller.js';
import { createEmployeesRepository } from '../repositories/employees.repository.js';
import { createEmployeesService } from '../services/employees.service.js';
import {
  validateCreateEmployee,
  validateEmployeeId,
  validateListEmployees,
  validateUpdateEmployee,
} from '../validators/employee.validator.js';

export function createEmployeesRouter(database) {
  const router = Router();
  const repository = createEmployeesRepository(database);
  const service = createEmployeesService(repository);
  const controller = createEmployeesController(service);

  router.post('/', validateCreateEmployee, controller.create);
  router.get('/', validateListEmployees, controller.list);
  router.get('/:id', validateEmployeeId, controller.get);
  router.put('/:id', validateUpdateEmployee, controller.update);
  router.delete('/:id', validateEmployeeId, controller.delete);
  return router;
}
