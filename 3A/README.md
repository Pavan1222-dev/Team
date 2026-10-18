# Employee Management Service (Assignment 3A)

This folder contains the initial foundation for the Employee Management REST API. Department, employee, and leave-request endpoints, business services, and seed data are not implemented yet.

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

These tests exercise health responses, leave-service business rules with a transactional stub, and migration locking/rollback behavior with a fake pool. They do not connect to or change PostgreSQL data. Database integration tests are separate and require an explicitly configured test database:

```sh
npm run test:integration
```

Set `TEST_DB_NAME` to a dedicated database name different from `DB_NAME`; integration tests create and remove only a uniquely named temporary schema inside that test database.

## Project structure

- `src/config/` contains PostgreSQL connection configuration and a CLI connection check.
- `src/app.js` configures Express and exports the app for later tests.
- `src/server.js` starts the listener and closes the HTTP server and pool on shutdown.
- `src/routes/`, `controllers/`, `repositories/`, `validators/`, and `middleware/` are reserved for the public API layers. `src/services/leave-service.js` currently contains internal leave workflow operations.
- `migrations/` contains schema changes; `scripts/migrate.js` applies them explicitly through the advisory-locked runner.
- `seeds/` is reserved for later seed data; `tests/` contains health, service, migration-runner, and optional PostgreSQL integration coverage; `docs/` contains the ER diagram.

## Remaining assignment work

The foundation, schema migrations, and internal transactional leave workflow service are in place. The remaining work includes department and employee CRUD, public leave request and review APIs, reports (including recursive hierarchy), employee search, seed data with at least 50 employees, and broader API-level tests.
