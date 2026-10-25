
# Document Upload Service

A beginner-friendly document management API built with Node.js,
Express, Multer, Sharp and SQLite.

## Features
- Upload single or multiple files
- Accept PDF, JPG and PNG only
- Maximum size: 5 MB per file
- Check file signatures (magic bytes)
- Generate 200px-wide image thumbnails
- Detect duplicates using SHA-256
- List and filter documents
- Download documents by ID
- Soft delete and restore within 7 days

## Installation
npm install
npm run dev

## Server
http://localhost:3000

## Upload
POST /documents

Body: form-data
files: File
title: Invoice
type: invoice
tags: invoice,october

## List and filters
GET /documents
GET /documents?type=pdf
GET /documents?tag=invoice
GET /documents?from=2026-10-01&to=2026-10-31

## Download
GET /documents/1/download

## Delete and restore
DELETE /documents/1
GET /trash
POST /documents/1/restore

## Storage
uploads/       - Original files
thumbnails/    - Image thumbnails
documents.db   - SQLite database
