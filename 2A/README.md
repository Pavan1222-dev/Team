# Library Management API

A REST API built with Node.js, Express, and SQLite to manage books, members, and book loans.

## Features
- CRUD operations for books and members
- Search books by title, author, or category
- Issue and return books
- Maximum of three active loans per member
- 14-day loan period and late fee of ₹10 per day
- Overdue-loan listing
- Joi request validation
- Pagination and sorting for book and loan lists
- Layered architecture: routes, controllers, services, and data-access

## Requirements
- Node.js and npm
- Postman for API testing

## Installation and running
From the project folder, run:

```bash
npm install
npm install express better-sqlite3 joi
node app.js
```

The server should run at `http://localhost:3000`. If the dependencies are already in `package.json`, `npm install` should install them.

## Expected project structure
```text
library-management/
├── app.js
├── database/db.js
├── routes/
├── controllers/
├── services/
├── data-access/
├── middleware/
└── validations/
```

## Books endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/books` | List books |
| GET | `/api/books?search=term` | Search by title, author, or category |
| GET | `/api/books/:id` | Get one book |
| POST | `/api/books` | Create a book |
| PUT | `/api/books/:id` | Update a book |
| DELETE | `/api/books/:id` | Delete a book |

Example book body:
```json
{
  "title": "The Alchemist",
  "author": "Paulo Coelho",
  "isbn": "ISBN1001",
  "category": "Fiction",
  "total_copies": 5,
  "available_copies": 5
}
```

## Members endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/members` | List members |
| GET | `/api/members/:id` | Get one member |
| POST | `/api/members` | Create a member |
| PUT | `/api/members/:id` | Update a member |
| DELETE | `/api/members/:id` | Delete a member |

Example member body:
```json
{
  "name": "Divya Sharma",
  "email": "divya@example.com",
  "phone": "9876543210",
  "membership_type": "Premium"
}
```

The current Joi schema allows `Standard` and `Premium` membership types and expects a 10-digit phone number.

## Loan endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/loans` | Issue a book |
| POST | `/api/loans/:id/return` | Return a book |
| GET | `/api/loans` | List loans |
| GET | `/api/loans?overdue=true` | List overdue active loans |

Example issue body:
```json
{
  "book_id": 1,
  "member_id": 1
}
```

Use IDs that exist in your database. The loan period is 14 days and the late fee is ₹10 per day after the due date.

## Pagination and sorting
Examples:
```text
GET /api/books?page=1&limit=10
GET /api/books?search=Node&page=1&limit=5
GET /api/books?sortBy=title&order=asc
GET /api/loans?page=1&limit=10
GET /api/loans?overdue=true&page=1&limit=5
GET /api/loans?sortBy=due_date&order=asc
```

The pagination limit should be between 1 and 100. Check the allowed sort fields in the current source code.

## Response formats
Successful responses generally look like:
```json
{
  "success": true,
  "data": {}
}
```

Error responses generally look like:
```json
{
  "success": false,
  "error": "Description of the error"
}
```

Validation errors may include a `details` array with field-specific messages.

## Common status codes
| Status | Meaning |
|---|---|
| 200 | Request succeeded |
| 201 | Record created |
| 204 | Record deleted; no response body |
| 400 | Invalid input |
| 404 | Record not found |
| 409 | Duplicate value or business-rule conflict |
| 500 | Unexpected server error |

## Import Postman collection
1. Start the API with `node app.js`.
2. Open Postman and select **Import**.
3. Import `Library_Management_API.postman_collection.json`.
4. Run Books and Members requests first.
5. Use actual book, member, and loan IDs when testing loans.

Some requests deliberately create duplicate records or use example IDs. If you run them more than once, their results may differ. Update the loan-return ID to an existing active loan.

## Final verification checklist
- [ ] Server starts without errors
- [ ] Database tables are created
- [ ] Book CRUD and search work
- [ ] Member CRUD works
- [ ] Duplicate ISBN and email conflicts are handled
- [ ] Invalid request bodies return validation errors
- [ ] Issuing a book decreases available copies
- [ ] Returning a book increases available copies
- [ ] Three-active-loan limit is enforced
- [ ] Late fees and overdue listing work
- [ ] Pagination and sorting work
- [ ] Postman collection has been imported and tested

## Note
This README describes the intended API and folder structure. Verify each endpoint against your current code before submission, especially after refactoring routes and adding validation and pagination.
