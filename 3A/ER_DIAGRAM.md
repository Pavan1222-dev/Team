# ER Diagram

```text
+--------------------+        1       +--------------------+
| departments        | --------------> | employees          |
|--------------------|                 |--------------------|
| id (PK)            |                 | id (PK)            |
| name (UNIQUE)      |                 | name               |
+--------------------+                 | department_id (FK) |
                                       | manager_id (FK)    |
                                       | joining_date       |
                                       | leave_balance      |
                                       +--------------------+
                                                ^
                                                |
                                                |
                                       1 employee may have many
                                       leave requests

+--------------------+
| leave_requests     |
|--------------------|
| id (PK)            |
| employee_id (FK)   |
| start_date         |
| end_date           |
| status             |
+--------------------+
```

Notes:
- Each department has many employees.
- Each employee belongs to one department.
- Each employee may have one manager (also an employee).
- Each employee can create many leave requests.
- leave_requests.status values are Pending, Approved, Rejected.
