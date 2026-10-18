-- Supports employee-correlated EXISTS lookups for approved leave covering CURRENT_DATE.
CREATE INDEX leave_requests_approved_employee_dates_idx
  ON leave_requests (employee_id, start_date, end_date)
  WHERE status = 'APPROVED';
