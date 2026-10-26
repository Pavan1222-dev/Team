# URL Shortener

A small HTTP service that creates persistent short links, redirects to their
destinations, tracks clicks, and supports optional expiration.

## Setup and run

- Install Node.js 18 or newer and npm.
- From this folder, install dependencies and start the service:

```sh
npm install
npm start
```

The server listens on port `3000`. Set the optional `PORT` environment variable
to an available integer port from 1 through 65535. No `.env` file or secrets
are required. SQLite data is created locally in `data/urls.sqlite` and is not
tracked by Git.

## API

Create a short URL:

```http
POST /api/shorten
Content-Type: application/json

{"url":"https://example.com/path","expiresAt":"2030-01-01T00:00:00Z"}
```

`expiresAt` is optional and must be a future date-time. Destinations must be
absolute `http` or `https` URLs.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/:shortCode` | Redirect to the saved destination and record a click |
| `POST` | `/api/shorten` | Create a short URL |
| `GET` | `/api/urls/:shortCode` | Read URL metadata |
| `GET` | `/api/urls/:shortCode/stats` | Read URL metadata and click count |
| `DELETE` | `/api/urls/:shortCode` | Delete a short URL |

JSON API responses use a `success` field and a `data` or `error` field. Invalid
JSON, oversized bodies, invalid destination URLs, and unsupported schemes
receive client errors; unexpected failures are logged and return a generic
server error.

## Design decisions

- The built-in Node HTTP server keeps the service small and avoids an extra web
  framework dependency.
- SQLite stores short links and click events durably; parameterized statements
  are used for all values.
- Short codes are generated from cryptographic random bytes, and URL schemes
  are allow-listed before persistence and redirect.
- Expired records are treated as unavailable; generated databases remain local.
