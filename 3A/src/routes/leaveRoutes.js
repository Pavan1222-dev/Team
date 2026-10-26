import express from 'express';
import leaveController from '../controllers/leaveController.js';

const router = express.Router();

// Map leave request URLs to the controller functions.
router.post('/', leaveController.createLeaveRequest);
router.get('/', leaveController.getAllLeaveRequests);
router.get('/employee/:employeeId', leaveController.getLeaveRequestsByEmployee);
router.put('/:id', leaveController.updateLeaveStatus);

export default router;
