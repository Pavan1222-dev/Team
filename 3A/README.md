# Employee Leave Management

This is a basic Node.js + PostgreSQL API for managing employees, departments, and leave requests.

## Features
- CRUD for departments
- CRUD for employees
- Employee manager relationship
- Leave request creation and approval/rejection
- Leave balance reduction only on approval
- Department headcount report
- Today’s employees on leave report
- Reporting hierarchy using a recursive SQL query
- Employee search by name, department, and joining-date range
- PostgreSQL with parameterized SQL queries

## Project Structure
```text
3A/
├── database/
│   ├── migrations/
│   │   ├── 001_create_tables.sql
│   │   └── 002_remove_unpictured_employee_unique.sql
│   ├── runMigrations.js
│   └── seed.js
├── server.js
├── src/
│   ├── config/
│   │   ├── db.js
│   │   └── env.js
│   ├── controllers/
│   │   ├── departmentController.js
│   │   ├── employeeController.js
│   │   └── leaveController.js
│   ├── queries/
│   │   ├── departmentQueries.js
│   │   ├── employeeQueries.js
│   │   └── leaveQueries.js
│   ├── routes/
│   │   ├── departmentRoutes.js
│   │   ├── employeeRoutes.js
│   │   └── leaveRoutes.js
│   ├── services/
│   │   ├── departmentService.js
│   │   ├── employeeService.js
│   │   └── leaveService.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## What the folders are for

The folders keep related files together; they do not make separate programs:

- `server.js` is at the project root as the entry point. It starts Express and connects the URL groups.
- `src/routes/` says which URL and HTTP method call a controller.
- `src/controllers/` reads the request and sends the HTTP response.
- `src/services/` contains the work for each feature, such as checking leave overlap before approval.
- `src/queries/` keeps the SQL statements separate from the JavaScript feature logic. Query values are supplied as parameters.
- `src/config/` loads settings and creates the shared PostgreSQL connection pool.
- `database/migrations/` contains SQL files that create or change database tables.
- `database/runMigrations.js` applies the migration files; `database/seed.js` inserts sample data.

For example, a `GET /api/departments` request follows this path:
```text
server.js -> departmentRoutes.js -> departmentController.js
          -> departmentService.js -> departmentQueries.js -> PostgreSQL
```

This is a small, common separation of responsibilities. Keeping everything in one file would be fewer folders, but it would combine URL handling, database code, and business rules into a harder-to-follow file.

## Setup
1. Install dependencies:
```bash
npm install
```

2. Create a PostgreSQL database named `employee_leave_db`.

3. Make sure the PostgreSQL server is running, then copy `.env.example` to `.env` and update the credentials to match your PostgreSQL setup. In PowerShell, run:
```powershell
Copy-Item .env.example .env
```

Open `.env` and use the same server, port, username, password, and database as your SQLTools connection. SQLTools and the Node app keep separate connection settings; a successful SQLTools connection does not automatically configure `.env`.

The supported variables are `PORT`, `PGHOST`, `PGPORT`, `PGUSER`,
`PGPASSWORD`, and `PGDATABASE`. `.env.example` contains placeholders only; keep
your real `.env` local and never commit it.

4. Run migrations:
```bash
npm run migrate
```

5. Seed the database with sample data:
```bash
npm run seed
```

**Important:** `npm run seed` clears existing rows in the departments, employees, and leave requests tables before it adds sample data. Run it only when you are okay replacing those rows.

6. Start the server:
```bash
npm start
```

The server starts at `http://localhost:3000`. Keep it running in that PowerShell window while you try the API. SQLTools connects to the PostgreSQL database so you can run SQL and inspect tables; the Node app connects separately using the values in `.env`.

## Example API Endpoints
```text
GET /api/departments
POST /api/departments
GET /api/employees
GET /api/employees/search?name=Alice&department_id=1&start_date=2020-01-01&end_date=2024-12-31
GET /api/employees/report/headcount
GET /api/employees/report/leave-today
GET /api/employees/report/hierarchy/1
POST /api/leaves
GET /api/leaves
PUT /api/leaves/:id
```

## ER Diagram
```text
departments
- id (PK)
- name

employees
- id (PK)
- name
- department_id (FK -> departments.id)
- manager_id (FK -> employees.id)
- joining_date
- leave_balance

leave_requests
- id (PK)
- employee_id (FK -> employees.id)
- start_date
- end_date
- status
```

## Design decisions

- Express routes, controllers, services, and parameterized query modules keep
  HTTP handling, business rules, and PostgreSQL access separate.
- SQL migrations make schema changes explicit and repeatable; sample data is
  seeded separately from schema creation.
- PostgreSQL settings are loaded from environment variables so local credentials
  stay outside the source tree.
- Controllers return structured HTTP errors for invalid or missing resources,
  while unexpected failures are logged centrally.

## Notes
- Department deletion is blocked if the department still has employees.
- A leave request is rejected when it overlaps with an already approved leave for the same employee.
- Department names are unique; employee names are not unique, as shown in the ER diagram.
- The project intentionally uses a simple beginner-friendly structure.
