# Employee Management API

A REST API for managing employees, departments, leave requests, and workforce reports. The service is built with Node.js and Express, with PostgreSQL as its database.

## Features

- Create and list employees, and search by name, department, and joining-date range.
- Create and list departments, and delete departments when no employees are assigned to them.
- Submit leave requests and approve or reject pending requests. Approving a request deducts the requested days from the employee's leave balance in a database transaction.
- View department headcount, employees currently on approved leave, and an employee's management chain.
- Use parameterized SQL queries for request-supplied values.

## Technology

- **Node.js** runs the application.
- **Express 5** handles HTTP requests and routes.
- **PostgreSQL** stores application data.
- **node-postgres (`pg`)** manages database connections and queries.
- **dotenv** loads the database connection string from the local environment.
- **ESLint** checks JavaScript code quality.

## Requirements

- Node.js and npm
- Access to a PostgreSQL database

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root and set your PostgreSQL connection string:

   ```env
   DATABASE_URL=postgresql://username:password@host:5432/database
   ```

   Replace the example values with the connection details for your database. Do not commit `.env` or share database credentials.

3. Create the tables and indexes:

   ```bash
   node src/migrate.js
   ```

4. (Optional) Add sample departments and employees:

   ```bash
   npm run seed
   ```

5. Start the API:

   ```bash
   npm start
   ```

   The server listens on `http://localhost:3000`.

## Available scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the API server. |
| `npm run seed` | Insert sample departments and employees. |
| `npm run lint` | Run ESLint across the project. |

## API endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/employees` | List employees. |
| `GET` | `/employees/search` | Search employees. Optional query parameters: `name`, `department`, `start_date`, and `end_date`. |
| `POST` | `/employees` | Create an employee. Requires `name`, `department_id`, and `joining_date`; `manager_id` is optional. |
| `GET` | `/departments` | List departments. |
| `POST` | `/departments` | Create a department. Requires `name`. |
| `DELETE` | `/departments/:id` | Delete a department if it has no assigned employees. |
| `POST` | `/leaves` | Submit a leave request. Requires `employee_id`, `start_date`, and `end_date`. |
| `PUT` | `/leaves/:id/status` | Approve or reject a pending request. The JSON body must contain `status` set to `APPROVED` or `REJECTED`. |
| `GET` | `/reports/headcount` | Get employee counts by department. |
| `GET` | `/reports/on-leave-today` | List employees with approved leave covering the current date. |
| `GET` | `/reports/hierarchy/:employee_id` | Get the employee's management chain. |

Requests with a JSON body should use the `Content-Type: application/json` header. For example, to create a department:

```http
POST /departments
Content-Type: application/json

{"name":"Engineering"}
```

## Project structure

```text
src/
  db.js                 PostgreSQL connection pool
  migrate.js            Database table and index setup
  seed.js               Sample data insertion
  server.js             Express app and server startup
  routes/
    departments.js      Department endpoints
    employees.js        Employee endpoints and search
    leaves.js           Leave request endpoints
    reports.js          Reporting endpoints
```
