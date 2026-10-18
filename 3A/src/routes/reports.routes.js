import { Router } from 'express';
import { createReportsController } from '../controllers/reports.controller.js';
import { createReportsRepository } from '../repositories/reports.repository.js';
import { createReportsService } from '../services/reports.service.js';
import { validateHierarchyEmployeeId } from '../validators/reports.validator.js';

export function createReportsRouter(database) {
  const router = Router();
  const service = createReportsService(createReportsRepository(database));
  const controller = createReportsController(service);

  router.get('/department-headcount', controller.departmentHeadcount);
  router.get('/employees-on-leave-today', controller.employeesOnLeaveToday);
  router.get('/employees/:id/hierarchy', validateHierarchyEmployeeId, controller.managerHierarchy);
  return router;
}
