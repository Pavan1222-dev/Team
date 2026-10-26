import express from 'express';
import employeeController from '../controllers/employeeController.js';

const router = express.Router();

// Put specific report and search paths before the general /:id path.
router.post('/', employeeController.createEmployee);
router.get('/', employeeController.getAllEmployees);
router.get('/search', employeeController.searchEmployees);
router.get('/report/headcount', employeeController.getHeadcountByDepartment);
router.get('/report/leave-today', employeeController.getEmployeesOnLeaveToday);
router.get('/report/hierarchy/:id', employeeController.getReportingHierarchy);
router.get('/:id', employeeController.getEmployeeById);
router.put('/:id', employeeController.updateEmployee);
router.delete('/:id', employeeController.deleteEmployee);

export default router;
