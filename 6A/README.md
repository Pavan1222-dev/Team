# Document upload service

A small Express API for uploading and managing PDF, JPG, and PNG documents. Files
are saved in `uploads/`, and document details are stored in `documents.sqlite`.

## Run the service

Install the packages listed in `package.json`, then start the server:

```sh
npm install
npm start
```

The API runs at `http://localhost:3000`. Set the optional `PORT` environment
variable to use a different port. No `.env` file or credentials are required.
The SQLite database and uploaded files are generated locally and are excluded
from version control.

## Upload documents

Send a `multipart/form-data` request to `POST /documents`. Add one or more files
under the field name `files`. The `title`, `documentType`, and optional `tags`
fields apply to each file in the request. Separate tags with commas.

Each file must be 5 MB or smaller and its file extension must match its detected
content. Supported files are PDF, JPG/JPEG, and PNG. Images automatically get a
200-pixel-wide JPEG thumbnail. A SHA-256 check rejects content that was already
uploaded.

Example fields:

```text
files: (one or more files)
title: October invoice
documentType: invoice
tags: October, paid
```

## API endpoints

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/documents` | Upload one or more documents |
| `GET` | `/documents` | List active documents |
| `GET` | `/documents?type=invoice&tag=paid&from=2026-10-01&to=2026-10-31` | Filter by type, tag, or upload date |
| `GET` | `/documents/:id/download` | Download a document |
| `GET` | `/documents/:id/thumbnail` | View an image thumbnail |
| `DELETE` | `/documents/:id` | Soft-delete a document |
| `POST` | `/documents/:id/restore` | Restore a deleted document within 7 days |

Dates use the `YYYY-MM-DD` format. Deleted documents are hidden from list and
download requests. The service returns a clear error for invalid files,
oversized files, duplicate content, and expired restore requests.

## Design decisions

- Express routes and controllers delegate validation, file handling, and metadata
  persistence to separate modules.
- Upload content is checked against detected file type, size limits, and a
  cryptographic digest before it is stored.
- SQLite stores metadata; files use generated names, and generated uploads,
  thumbnails, and the database stay local rather than entering Git.
- A shared error middleware logs unexpected failures and returns safe JSON
  messages for expected upload and request errors.