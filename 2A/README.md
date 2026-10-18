# Library Management API (Task 2A)

The API provides book and member management endpoints. Loan operations are not implemented yet.

## Setup

Requires Node.js 20 or newer. From this directory:

```sh
npm install
```

Copy `.env.example` to `.env` to customize the port or database path. By default the server listens on port 3000 and creates `data/library.sqlite`. The database directory is created on startup and generated database files are ignored by Git.

## Run

```sh
npm start
```

For automatic restart during development:

```sh
npm run dev
```

`GET /health` returns `{ "success": true, "data": { "status": "ok" }, "error": null }`.

## Tests and lint

```sh
npm test
npm run lint
```

## Intended architecture

- `routes/` maps HTTP paths to controllers.
- `controllers/` handles request and response details.
- `services/` contains business rules for books and members.
- `repositories/` contains parameterized SQLite queries.
- `validators/` contains Joi request validation.
- `middleware/` handles unmatched routes and centralized errors.
- `db/` opens SQLite and initializes the books, members, and loans schema.
- `utils/` contains shared response formatting.

`app.js` constructs and exports the Express application without opening a listening port, which allows automated tests to exercise it directly. `server.js` owns startup: it initializes the database first, then starts the HTTP listener. This keeps tests from needing to launch a separate server process.

The schema enforces required fields, unique ISBNs and member emails, valid copy counts, loan status/date consistency, and foreign-key references. These database constraints protect stored data even when later code paths change. Foreign-key enforcement is enabled explicitly for the connection.

## Available endpoints

- Books: create, search/list, view, update, and delete books.
- Members: create, list, view, update, and delete members.

Loan endpoints (borrow, return, and list loans) are not yet implemented.
