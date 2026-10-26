import express from 'express';
import departmentController from '../controllers/departmentController.js';

const router = express.Router();

// Map department URLs and HTTP methods to their controller functions.
router.post('/', departmentController.createDepartment);
router.get('/', departmentController.getAllDepartments);
router.get('/:id', departmentController.getDepartmentById);
router.put('/:id', departmentController.updateDepartment);
router.delete('/:id', departmentController.deleteDepartment);

export default router;
