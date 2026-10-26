# Library Management API

A small Express API for books, members, and loans.

## Run the project

1. Open a terminal in this folder.
2. Run `npm install` once.
3. Run `npm start`.
4. The API runs at `http://localhost:3000`.

The SQLite database is created automatically at `data/library.sqlite`.
No credentials are required. Set the optional `PORT` environment variable to
change the listening port from `3000`; it must be between 1 and 65535. No `.env`
file is required. The generated database is local runtime data and is not tracked.

## Project folders

- `routes`: maps URLs to controller functions.
- `controllers`: receives requests and sends responses.
- `services`: applies the library rules.
- `data_access`: reads and writes SQLite data.
- `validations`: checks request fields with Zod.
- `middlewares`: checks requests and formats errors.

## Endpoints

All URLs start with `http://localhost:3000`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/books` | List/search books. Supports `title`, `author`, `category`, `page`, `limit`, `sortBy`, `order`. |
| POST | `/api/books` | Add a book. |
| GET | `/api/books/:id` | Get one book. |
| PUT | `/api/books/:id` | Update a book. |
| DELETE | `/api/books/:id` | Delete a book. |
| GET | `/api/members` | List members. Supports `page`, `limit`, `sortBy`, `order`. |
| POST | `/api/members` | Add a member. |
| GET | `/api/members/:id` | Get one member. |
| PUT | `/api/members/:id` | Update a member. |
| DELETE | `/api/members/:id` | Delete a member. |
| GET | `/api/loans` | List loans. Supports `page`, `limit`, `sortBy`, `order`. |
| GET | `/api/loans/overdue` | List overdue loans. Supports `page`, `limit`, `sortBy`, `order`. |
| POST | `/api/loans` | Issue a book to a member. |
| POST | `/api/loans/:id/return` | Return a book and calculate its late fee. |

## Try it yourself

You can make requests from PowerShell after starting the server:

```powershell
$book = @{
  title = "The Hobbit"
  author = "J.R.R. Tolkien"
  isbn = "9780000000001"
  category = "Fantasy"
  totalCopies = 2
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3000/api/books" `
  -ContentType "application/json" `
  -Body $book
```

Then open `http://localhost:3000/api/books` to see the books.

## Rules

- Duplicate ISBNs and member emails return `409`.
- A book cannot be issued if no copies are available.
- A member can have at most 3 active loans.
- Books are due 14 days after issue. A return after the due date costs Rs 10 for each late day or part of a day.
- Invalid fields return `400`; missing records return `404`.
- Responses use `{ "success": true, "data": ..., "error": null }` for success.

## Design decisions

- Express routes, controllers, services, validation schemas, and SQLite access are
  separated by responsibility so request parsing stays apart from library rules.
- Zod validates incoming payloads and SQL parameters are bound rather than
  interpolated into queries.
- SQLite is initialized at server startup and keeps the project easy to run
  without a separately managed database server.
- Errors are translated by shared middleware into consistent JSON responses;
  unexpected server errors are logged without exposing stack traces to clients.
