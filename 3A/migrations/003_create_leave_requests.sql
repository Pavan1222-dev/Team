CREATE TABLE leave_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL CHECK (length(trim(reason)) > 0),
  status VARCHAR(10) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewer_id BIGINT REFERENCES employees(id) ON DELETE RESTRICT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT leave_request_end_not_before_start CHECK (end_date >= start_date),
  CONSTRAINT leave_request_review_fields_consistent CHECK (
    (status = 'PENDING' AND reviewer_id IS NULL AND reviewed_at IS NULL) OR
    (status IN ('APPROVED', 'REJECTED') AND reviewer_id IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);

CREATE INDEX leave_requests_employee_status_idx ON leave_requests (employee_id, status);
CREATE INDEX leave_requests_employee_dates_idx ON leave_requests (employee_id, start_date, end_date);
CREATE INDEX leave_requests_reviewer_id_idx ON leave_requests (reviewer_id);
