# Library Management API (Project 2A)

This is a REST API built with Express.js to manage library books, members, and loans.

## How to Run the Project
1. Install the required tools: `npm install`
2. Start the server: `node index.js`
3. The server will start on `http://localhost:3000`. 
4. A local `library.db` SQLite file will be created automatically to save the data.

## Design Decisions
* **Layered Architecture:** Code is split into `routes`, `controllers`, `services`, and `data-access` for clean organization.
* **Smart Validation:** Uses `zod` middleware to block bad requests and return 400 field-level errors if data is missing.
* **Safe Error Handling:** A central error handler ensures the app never crashes and always returns `{ success, data, error }`.

## API Endpoint Menu

| Method     | Endpoint                   | Description                                                                |
| :--------- | :------------------------- | :------------------------------------------------------------------------- |
| **POST**   | `/books`                   | Add a new book (Requires title, author, isbn, category, total_copies)      |
| **GET**    | `/books?page=1&limit=10`   | List books (Supports `search` query by title/author/category)              |
| **PUT**    | `/books/:id`               | Update a book's details                                                    |
| **DELETE** | `/books/:id`               | Delete a book                                                              |
| ---------- | -------------------------- | -------------------------------------------------------------------------- |
| **POST**   | `/members`                 | Register a new library member                                              |
| **GET**    | `/members?page=1&limit=10` | List all registered members with pagination                                |
| **PUT**    | `/members/:id`             | Update member details                                                      |
| **DELETE** | `/members/:id`             | Delete a member                                                            |
| ---------- | -------------------------- | -------------------------------------------------------------------------- |
| **POST**   | `/loans/issue`             | Issue a book (Fails if member has 3 active loans or no copies left)        |
| **POST**   | `/loans/return/:id`        | Return a book (Calculates Rs 10/day late fee after 14 days)                |
| **GET**    | `/loans/overdue`           | List all loans that are past the 14-day limit                              |