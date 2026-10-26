import pool from '../config/db.js';
import leaveQueries from '../queries/leaveQueries.js';

// Create a leave request only if the date range is valid and no overlap exists.
async function createLeaveRequest(employeeId, startDate, endDate) {
  if (startDate > endDate) {
    const error = new Error('Start date cannot be later than end date.');
    error.statusCode = 400;
    throw error;
  }

  const overlapResult = await pool.query(leaveQueries.checkOverlapApproved, [
    employeeId,
    startDate,
    endDate
  ]);

  if (overlapResult.rows.length > 0) {
    const error = new Error('Leave request overlaps an existing approved leave request.');
    error.statusCode = 400;
    throw error;
  }

  const result = await pool.query(leaveQueries.createLeaveRequest, [employeeId, startDate, endDate]);
  return result.rows[0];
}

async function getAllLeaveRequests() {
  const result = await pool.query(leaveQueries.getAllLeaveRequests);
  return result.rows;
}

async function getLeaveRequestsByEmployee(employeeId) {
  const result = await pool.query(leaveQueries.getLeaveRequestsByEmployee, [employeeId]);
  return result.rows;
}

// Approve or reject a leave request. Leave balance is decreased only on approval.
async function updateLeaveStatus(leaveId, status) {
  const result = await pool.query(leaveQueries.getLeaveRequestById, [leaveId]);
  const leaveRequest = result.rows[0];

  if (!leaveRequest) {
    const error = new Error('Leave request not found.');
    error.statusCode = 404;
    throw error;
  }

  if (status === 'Approved') {
    const overlapResult = await pool.query(leaveQueries.checkOverlapApproved, [
      leaveRequest.employee_id,
      leaveRequest.start_date,
      leaveRequest.end_date
    ]);

    if (overlapResult.rows.length > 0 && overlapResult.rows[0].id !== leaveId) {
      const error = new Error('This leave request overlaps with another approved leave request.');
      error.statusCode = 400;
      throw error;
    }

    // Include both the first and last day when counting requested leave.
    const totalDays = Math.ceil((new Date(leaveRequest.end_date) - new Date(leaveRequest.start_date)) / (1000 * 60 * 60 * 24)) + 1;

    const employeeResult = await pool.query('SELECT leave_balance FROM employees WHERE id = $1', [leaveRequest.employee_id]);
    const employee = employeeResult.rows[0];

    if (!employee || employee.leave_balance < totalDays) {
      const error = new Error('Employee does not have enough leave balance for this request.');
      error.statusCode = 400;
      throw error;
    }

    // Deduct leave only after the request passes the approval checks.
    await pool.query(leaveQueries.reduceLeaveBalance, [totalDays, leaveRequest.employee_id]);
  }

  const updatedResult = await pool.query(leaveQueries.updateLeaveStatus, [status, leaveId]);
  return updatedResult.rows[0];
}

export default {
  createLeaveRequest,
  getAllLeaveRequests,
  getLeaveRequestsByEmployee,
  updateLeaveStatus
};
