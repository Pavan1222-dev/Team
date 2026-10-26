import leaveService from '../services/leaveService.js';

// Controllers connect leave HTTP endpoints to the leave services.
async function createLeaveRequest(req, res) {
  try {
    const leaveRequest = await leaveService.createLeaveRequest(
      req.body.employee_id,
      req.body.start_date,
      req.body.end_date
    );

    res.status(201).json({ message: 'Leave request created successfully', data: leaveRequest });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to create leave request' });
  }
}

async function getAllLeaveRequests(req, res) {
  try {
    const leaves = await leaveService.getAllLeaveRequests();
    res.status(200).json({ data: leaves });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch leave requests' });
  }
}

async function getLeaveRequestsByEmployee(req, res) {
  try {
    const leaves = await leaveService.getLeaveRequestsByEmployee(req.params.employeeId);
    res.status(200).json({ data: leaves });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch employee leave requests' });
  }
}

async function updateLeaveStatus(req, res) {
  try {
    const leaveRequest = await leaveService.updateLeaveStatus(req.params.id, req.body.status);
    res.status(200).json({ message: 'Leave status updated successfully', data: leaveRequest });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to update leave status' });
  }
}

export default {
  createLeaveRequest,
  getAllLeaveRequests,
  getLeaveRequestsByEmployee,
  updateLeaveStatus
};
