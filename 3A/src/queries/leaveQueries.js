// SQL used to create, find, and update leave requests.
const leaveQueries = {
  createLeaveRequest: `
    INSERT INTO leave_requests (employee_id, start_date, end_date, status)
    VALUES ($1, $2, $3, 'Pending')
    RETURNING *
  `,

  getLeaveRequestsByEmployee: `
    SELECT *
    FROM leave_requests
    WHERE employee_id = $1
    ORDER BY start_date
  `,

  getAllLeaveRequests: `
    SELECT lr.*, e.name AS employee_name
    FROM leave_requests lr
    INNER JOIN employees e ON e.id = lr.employee_id
    ORDER BY lr.start_date DESC
  `,

  getLeaveRequestById: `
    SELECT lr.*, e.name AS employee_name
    FROM leave_requests lr
    INNER JOIN employees e ON e.id = lr.employee_id
    WHERE lr.id = $1
  `,

  updateLeaveStatus: `
    UPDATE leave_requests
    SET status = $1
    WHERE id = $2
    RETURNING *
  `,

  checkOverlapApproved: `
    SELECT *
    FROM leave_requests
    WHERE employee_id = $1
      AND status = 'Approved'
      AND $2 <= end_date
      AND $3 >= start_date
  `,

  reduceLeaveBalance: `
    UPDATE employees
    SET leave_balance = leave_balance - $1
    WHERE id = $2
    RETURNING *
  `,

  getLeaveByEmployeeAndDate: `
    SELECT *
    FROM leave_requests
    WHERE employee_id = $1
      AND status = 'Approved'
      AND $2 <= end_date
      AND $3 >= start_date
  `,

  getAllApprovedLeaves: `
    SELECT *
    FROM leave_requests
    WHERE status = 'Approved'
  `
};

export default leaveQueries;
