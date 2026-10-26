# URL Shortener

A small URL-shortening API built with Node.js, Express, and SQLite. It creates short codes for long URLs, redirects visitors to the saved destination, and records clicks for basic statistics.

## Requirements

- Node.js and npm

## Run the project

From the project directory, install the dependencies and start the server:

```bash
npm install
npm start
```

The API listens at `http://localhost:3000`. The SQLite database file, `database.sqlite`, is created in the project’s current working directory when the server starts.

## API

### Create a short URL

`POST /shorten`

Send a JSON body with a required `url` and optional `alias` and `expiry_date`:

```json
{
  "url": "https://example.com/a/long/page",
  "alias": "example",
  "expiry_date": "2030-01-01T00:00:00Z"
}
```

Only `url` is required. If `alias` is omitted, the server generates a six-character code. If `expiry_date` is omitted, the link does not have an expiry date.

Example request:

```bash
curl.exe -X POST http://localhost:3000/shorten -H "Content-Type: application/json" -d '{"url":"https://example.com/a/long/page","alias":"example"}'
```

Successful response (`201 Created`):

```json
{
  "short_code": "example"
}
```

The short URL is `http://localhost:3000/example`.

Possible errors:

- `400 Bad Request` — URL is missing, malformed, or blocked by the URL checks.
- `409 Conflict` — the requested alias is already in use.
- `500 Internal Server Error` — an unexpected database error occurred.

### Follow a short URL

`GET /:code`

For example, `GET http://localhost:3000/example` looks up the code, checks its expiry date, records the click, then responds with a `302` redirect to the original URL.

Possible errors:

- `404 Not Found` — the code does not exist or the link has expired.

### View click statistics

`GET /stats/:code`

Example: `GET http://localhost:3000/stats/example`

Example response:

```json
{
  "total_clicks": 12,
  "clicks_per_day": [
    { "date": "2026-10-20", "count": 4 }
  ],
  "top_referrers": [
    { "referrer": "https://search.example", "count": 3 }
  ]
}
```

The daily counts cover the last seven days. The response includes up to five referrers, ordered by click count. A code with no recorded clicks returns a total of zero.

## How it works

1. `src/server.js` initializes the database, creates the Express app, and listens on port `3000`.
2. `src/app.js` defines the API routes and uses the database to store and retrieve URL and click data.
3. `src/db.js` opens SQLite and creates the `urls` and `clicks` tables when needed.
4. `src/utils.js` generates short codes and checks submitted URLs.

### Database tables

- `urls` stores the original URL, unique short code, and optional expiry date.
- `clicks` stores the short code, click timestamp, referrer, and user-agent for each redirect.

The URL checks reject malformed URLs, the `javascript:` protocol, and several localhost/private-network host patterns. This is a basic project-level check, not a complete security filter for every possible network address.

## Project structure

```text
src/
  app.js       Express routes and request handling
  db.js        SQLite connection and table setup
  server.js    Application startup and HTTP listener
  utils.js     URL checks and short-code generation
```
