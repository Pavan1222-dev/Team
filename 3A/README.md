# Employee Management Service (Assignment 3A)

This folder contains the Employee Management REST API, including department and employee CRUD and public leave-request workflows. Reports are not implemented yet.

## Requirements

- Node.js 20 or later
- PostgreSQL 18.4 (or a compatible PostgreSQL server)
- The `employee_management` database created in PostgreSQL

## Install and configure

```sh
npm install
```

Copy `.env.example` to `.env`, then set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` to the local database settings. Keep `.env` private; it is ignored by Git. The server uses port `3000` unless `PORT` is set.

The PostgreSQL pool is configured in `src/config/db.js`. It loads the local environment, checks that all required settings exist, and reports missing or invalid settings without embedding credentials in source code.

## Start the service

```sh
npm start
```

For development with automatic restarts:

```sh
npm run dev
```

`GET /health` returns `{ "status": "ok" }`. `GET /health/db` runs `SELECT current_database()` and returns the current database name when PostgreSQL is reachable. If it is unavailable, the endpoint returns HTTP 503 with a safe error message.

## Department and employee API

All API endpoints return JSON in the existing `{ "data": ... }` success shape. Errors use `{ "error": "..." }`. Delete operations return HTTP 204 with no body. List endpoints use `page` and `limit` (defaults: 1 and 10; maximum limit: 100) and return `items` with `pagination` metadata.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/departments` | Create a department (`name`; optional `description`) |
| GET | `/api/departments` | List departments; optional `name`, `page`, `limit`, `sortBy=name\|createdAt`, `order=asc\|desc` |
| GET | `/api/departments/:id` | Retrieve a department |
| PUT | `/api/departments/:id` | Partially update `name` and/or `description` |
| DELETE | `/api/departments/:id` | Delete a department only when no employees belong to it |
| POST | `/api/employees` | Create an employee with `firstName`, `lastName`, `email`, `departmentId`; optional `managerId`, `joiningDate` |
| GET | `/api/employees` | List/search employees; optional `name`, `department`, `departmentId`, `joiningDateFrom`, `joiningDateTo`, `page`, `limit`, `sortBy`, `order` |
| GET | `/api/employees/:id` | Retrieve an employee, including department name and manager ID |
| PUT | `/api/employees/:id` | Partially update employee fields; IDs and leave balance are server-controlled |
| DELETE | `/api/employees/:id` | Delete an employee unless preserved leave history references them |
| POST | `/api/leave-requests` | Submit a pending leave request (`employeeId`, `startDate`, `endDate`, `reason`) |
| GET | `/api/leave-requests` | List requests; optional `employeeId`, `status`, `startDateFrom`, `startDateTo`, `page`, `limit`, `sortBy`, `order` |
| GET | `/api/leave-requests/:id` | Retrieve a leave request |
| PATCH | `/api/leave-requests/:id/approve` | Approve a pending request; body requires `reviewerId` |
| PATCH | `/api/leave-requests/:id/reject` | Reject a pending request; body requires `reviewerId` |

Employee name search matches first name, last name, or the combined name. Department search is a partial, case-insensitive match; `departmentId` is an exact filter. Joining-date range endpoints are inclusive. Employee sorting accepts `firstName`, `lastName`, `email`, `departmentName`, `joiningDate`, or `createdAt`. All query values are parameterized, and sort columns/directions are allowlisted.

Leave request dates use `YYYY-MM-DD`; the end date must be on or after the start date. Duration is inclusive calendar days (`endDate - startDate + 1`). New requests are pending. Only the employee's manager may approve or reject a pending request. Approval locks the employee and request in a transaction, checks balance and inclusive overlap with approved leave, then changes the request and deducts balance atomically. Pending creation and rejection do not change balance. Repeated reviews, insufficient balance, and overlapping approved dates return HTTP 409. Invalid inputs return 400, missing employees/requests/reviewers return 404, and a reviewer who is not the manager receives 403. Leave list pagination defaults to page 1 and limit 10 (maximum 100); status accepts `PENDING`, `APPROVED`, or `REJECTED`.

There is no authentication in this project. The reviewer supplies `reviewerId` in the JSON body, and the service verifies that this ID belongs to the employee's configured manager. Since the caller is not authenticated, the API cannot prove that the caller actually controls that manager account; this must not be treated as secure authorization in a deployed service.

Submit a request:

```http
POST /api/leave-requests
Content-Type: application/json

{
  "employeeId": 12,
  "startDate": "2026-11-02",
  "endDate": "2026-11-04",
  "reason": "Annual leave"
}
```

The API returns HTTP 201 with `{ "data": { "id": "31", "employeeId": "12", "startDate": "2026-11-02", "endDate": "2026-11-04", "durationDays": 3, "status": "PENDING" } }` (the object also includes reviewer and timestamp fields).

Review a request as its manager:

```http
PATCH /api/leave-requests/31/approve
Content-Type: application/json

{ "reviewerId": 4 }
```

Successful review returns HTTP 200 with the request in `APPROVED` status and `remainingLeaveBalanceDays`. Rejection uses `PATCH /api/leave-requests/31/reject` with the same body and returns `REJECTED` without deducting leave balance. Errors use `{ "error": "..." }`; successes use `{ "data": ... }`.

Example create request:

```http
POST /api/employees
Content-Type: application/json

{
  "firstName": "Ada",
  "lastName": "Lovelace",
  "email": "ada@example.com",
  "departmentId": 1,
  "managerId": 2,
  "joiningDate": "2024-03-01"
}
```

Example create response (HTTP 201):

```json
{
  "data": {
    "id": "1",
    "firstName": "Ada",
    "lastName": "Lovelace",
    "email": "ada@example.com",
    "departmentId": "1",
    "departmentName": "Research",
    "managerId": "2",
    "joiningDate": "2024-03-01",
    "leaveBalanceDays": "20.00"
  }
}
```

Example paginated employee response:

```json
{
  "data": {
    "items": [],
    "pagination": { "page": 1, "limit": 10, "totalItems": 0, "totalPages": 0 }
  }
}
```

Duplicate department names and employee emails return HTTP 409. Invalid inputs return HTTP 400; unknown IDs return HTTP 404. Department deletion with employees returns HTTP 409. Employee deletion preserves leave history and returns HTTP 409 when a leave request references the employee. Managers and departments must exist; self-management is rejected.

To check connectivity from the command line without starting the HTTP server:

```sh
npm run db:check
```

This query reports the database name but never prints the configured username or password.

## Database migrations

The ordered SQL files live in `migrations/`. Apply them explicitly with:

```sh
npm run migrate
```

The runner creates `schema_migrations`, reads `.sql` files in filename order, and applies each unapplied file in its own transaction. A PostgreSQL advisory lock serializes migration processes. A filename is recorded in the same transaction as its schema changes, so a failed file is rolled back and not marked applied. The lock is released and the pool is closed on success or failure. Already-recorded files are skipped. **Migrations are not run automatically by `npm start` or during setup.** Review the SQL and confirm the target database before running the command. The runner does not drop or reset existing data.

The employee migration gives new employees a default leave balance of 20 days. No employees or other seed data are created by these migrations. The project’s later seed stage must add the required sample data, including at least 50 employees.

## Initial schema and business rules

- Departments have a unique name.
- Employees reference a department with `ON DELETE RESTRICT`, so a department containing employees cannot be removed. Manager references point to another employee; deleting a manager sets that reference to null. An employee cannot be their own manager.
- Leave requests use `PENDING`, `APPROVED`, or `REJECTED` status and cannot end before they start. Employee/reviewer references preserve request history.
- `src/services/leave-service.js` provides reusable pending-request creation, approval, and rejection operations; public leave HTTP routes are not implemented yet. Reviews lock the request and employee rows in one transaction, verify that the reviewer is the employee's manager, and check available balance and inclusive date overlap before approval. Leave duration uses calendar days including both endpoints: `end_date - start_date + 1`. Approval status, reviewer data, and balance deduction commit together. Pending creation and rejection do not deduct balance. Failed operations roll back.
- All future values in application SQL must be passed as query parameters.

An ER diagram for this initial schema is in [`docs/er-diagram.md`](docs/er-diagram.md).

Run the unit and migration-runner test suite with:

```sh
npm test
```

These tests exercise health responses, leave-service business rules with a transactional stub, and migration locking/rollback behavior with a fake pool. PostgreSQL integration tests cover leave-service behavior and department/employee APIs in an isolated temporary schema. They require an explicitly configured test database:

```sh
npm run test:integration
```

Set `TEST_DB_NAME` to a dedicated database name different from `DB_NAME`; integration tests create and remove only a uniquely named temporary schema inside that test database. `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER`, and `TEST_DB_PASSWORD` may override the normal `DB_*` connection settings.

## Project structure

- `src/config/` contains PostgreSQL connection configuration and a CLI connection check.
- `src/app.js` configures Express and exports the app for later tests.
- `src/server.js` starts the listener and closes the HTTP server and pool on shutdown.
- `src/routes/`, `controllers/`, `repositories/`, `validators/`, and `middleware/` separate the API layers. `src/services/leave-service.js` owns transactional leave workflow rules; `src/services/leave-requests.service.js` composes them with the public read API.
- `migrations/` contains schema changes; `scripts/migrate.js` applies them explicitly through the advisory-locked runner.
- `seeds/` is reserved for later seed data; `tests/` contains health, service, migration-runner, and optional PostgreSQL integration coverage; `docs/` contains the ER diagram.

## Remaining assignment work

The foundation, schema migrations, department and employee CRUD, search, and transactional leave-request API are implemented. Remaining assignment work includes reports (including recursive hierarchy), seed data with at least 50 employees, and authentication before reviewer IDs can be trusted as caller identity.
