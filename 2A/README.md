# Library Management API (Task 2A)

Stage 1 provides the project foundation, SQLite schema, and health endpoint. Book, member, and loan operations are not implemented yet.

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
- `services/` contains business rules; it will be added when operations are implemented.
- `repositories/` contains database queries; it will be added alongside those services.
- `validators/` contains request validation; Joi is installed for later stages.
- `middleware/` handles unmatched routes and centralized errors.
- `db/` opens SQLite and initializes the books, members, and loans schema.
- `utils/` contains shared response formatting.

`app.js` constructs and exports the Express application without opening a listening port, which allows automated tests to exercise it directly. `server.js` owns startup: it initializes the database first, then starts the HTTP listener. This keeps tests from needing to launch a separate server process.

The schema enforces required fields, unique ISBNs and member emails, valid copy counts, loan status/date consistency, and foreign-key references. These database constraints protect stored data even when later code paths change. Foreign-key enforcement is enabled explicitly for the connection.

## Planned endpoints (not yet implemented)

- Books: create, list, view, update, and delete books.
- Members: create, list, view, update, and delete members.
- Loans: borrow a book, return a book, and list loan records.
