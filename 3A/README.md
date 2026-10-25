# Employee Management Service

A REST API built using Node.js, Express.js, and PostgreSQL to manage employees, departments, and employee leave requests.

## Features

- Department management: Create, view, update, and delete departments.
- Employee management: Create, view, update, and delete employees.
- Employee search: Search and filter employees by name, department, and joining date.
- Leave management: Submit leave requests, approve or reject requests, and track leave balances.
- Reports: Department headcount, employees currently on leave, and reporting hierarchy.
- Database relationships: Foreign keys, constraints, and indexes.
- Error handling and parameterized SQL queries.

## Technologies Used

- Node.js
- Express.js
- PostgreSQL
- node-postgres (`pg`)
- dotenv
- Nodemon

## Installation

1. Clone or download this repository.
2. Install dependencies:

   `npm install`

3. Create a `.env` file in the project root and configure your PostgreSQL connection:

   `PORT=3000`  
   `DB_HOST=localhost`  
   `DB_PORT=5432`  
   `DB_NAME=emp_management`  
   `DB_USER=postgres`  
   `DB_PASSWORD=your_password`

4. Create the database and tables using the project's SQL scripts.
5. Start the application:

   `npm run dev`

## API Endpoints

### Employees

- `GET /api/employees`
- `GET /api/employees/:id`
- `GET /api/employees/search`
- `POST /api/employees`
- `PUT /api/employees/:id`
- `DELETE /api/employees/:id`

### Departments

- `GET /api/departments`
- `GET /api/departments/:id`
- `POST /api/departments`
- `PUT /api/departments/:id`
- `DELETE /api/departments/:id`

### Leave Requests

- `GET /api/leaves`
- `POST /api/leaves`
- `PATCH /api/leaves/:id/review`

### Reports

- `GET /api/reports/department-headcount`
- `GET /api/reports/employees-on-leave-today`
- `GET /api/reports/hierarchy/:id`

## Health Check

- `GET /`
- `GET /health/db`

## Security Notes

- Keep `.env` out of version control.
- Never commit database passwords or other secrets.
- Use authentication and authorization before deploying the service publicly.
