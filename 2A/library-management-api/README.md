# Library Management API

A small REST API for books, members, and loans. It uses Express 5, Zod, ES modules, and JSON files so the project is easy to run and inspect without a database server.

## Requirements

- Node.js 20 or newer
- npm

## Run locally

```powershell
npm install
npm run dev
```

The API listens on `http://localhost:3000/api/v1`. Set `PORT` to use another port, or run `npm start` for the regular server process. The health check is `GET /api/v1/health`.

The JSON collections live in `data/books.json`, `data/members.json`, and `data/loans.json`. Records use generated UUIDs. Keep these files in version control only when you intentionally want to share their contents. JSON storage is intended for a small, single-process learning project; use SQLite or a transactional database for concurrent or production workloads.

## Response format

Successful responses use `{ "success": true, "data": ..., "error": null }`. Errors use `{ "success": false, "data": null, "error": { "message": "...", "details": [...] } }`. Validation details identify the failing `field` and explain the problem. `DELETE` returns `204 No Content` without a response body.

List endpoints return the records and pagination metadata inside `data`:

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": { "page": 1, "limit": 10, "total": 0, "totalPages": 0 }
  },
  "error": null
}
```

List endpoints accept `page` (default 1), `limit` (default 10, maximum 100), `sortBy`, and `order` (`asc` or `desc`). Unsupported sort fields and invalid pagination values return 400. Books also support case-insensitive `title`, `author`, and `category` substring filters. Loans support `status=active|returned` and `overdue=true`.

## Endpoint table

All paths below are relative to `/api/v1`.

| Method | Path | Purpose | Success |
| --- | --- | --- | --- |
| GET | `/health` | Health check | 200 |
| GET | `/books` | Search and list books | 200 |
| POST | `/books` | Create a book | 201 |
| GET | `/books/:id` | Get one book | 200 |
| PATCH | `/books/:id` | Update book fields | 200 |
| DELETE | `/books/:id` | Delete a book without active loans | 204 |
| GET | `/members` | List members | 200 |
| POST | `/members` | Create a member | 201 |
| GET | `/members/:id` | Get one member | 200 |
| PATCH | `/members/:id` | Update member fields | 200 |
| DELETE | `/members/:id` | Delete a member without active loans | 204 |
| GET | `/loans` | List loans; filter overdue loans with `overdue=true` | 200 |
| POST | `/loans` | Issue a book: `{ "bookId": "UUID", "memberId": "UUID" }` | 201 |
| POST | `/loans/:id/return` | Return an active loan and calculate any late fee | 200 |

### Request fields

- **Book:** `title`, `author`, `isbn`, `category`, `totalCopies`. `availableCopies` is managed by the API. ISBNs must be unique. Reducing total copies below copies currently on loan returns 409.
- **Member:** `name`, `email`, `phone`, `membershipType` (`standard`, `premium`, or `student`). Email addresses are normalized to lowercase and must be unique.
- **Loan:** a member may have at most three active loans. A book cannot be issued when its available count is zero. Both cases return 409.

An issue date is recorded at checkout, with a due date 14 calendar days later. A return on or before the due date has a zero fee; each full day after the due date costs Rs 10. The loan response records `overdueDays` and `lateFee` (in rupees). An overdue loan is active and its due date is before the current time.

## Project structure

```text
src/
  app.js                 Express setup and middleware order
  server.js              HTTP server entry point
  routes/                URL-to-controller mapping
  controllers/           HTTP input/output handling
  services/              Library rules and workflows
  data/                  JSON repository and collection setup
  middleware/            Not-found and central error handling
  validation/            Zod request schemas
  utils/                 Errors, validation, pagination, async wrapper
data/                    JSON collections
postman/                 Importable Postman collection
```

## Postman

Import [`postman/Library Management API.postman_collection.json`](postman/Library%20Management%20API.postman_collection.json) into Postman. The collection defines `baseUrl` and saves created book, member, and loan IDs for subsequent requests. It includes successful CRUD and loan workflows, duplicate ISBN/email, invalid field, missing record, no available copy, fourth active loan, repeated return, invalid pagination, and overdue-list requests. To exercise the overdue return workflow, issue a loan, then change that loan's `dueAt` in `data/loans.json` to a timestamp more than 14 days in the past before running the return request; restore the JSON data afterward if desired.

