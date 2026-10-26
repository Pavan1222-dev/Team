import sqlite3 from 'sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const databasePath = path.resolve(currentDirectory, '..', 'documents.sqlite');
const db = new sqlite3.Database(databasePath);

function run(sql, values = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, values, function (error) {
      if (error) {
        reject(error);
      } else {
        resolve({ changes: this.changes, lastID: this.lastID });
      }
    });
  });
 }

function get(sql, values = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, values, (error, row) => {
      if (error) {
        reject(error);
      } else {
        resolve(row);
      }
    });
  });
}

function all(sql, values = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, values, (error, rows) => {
      if (error) {
        reject(error);
      } else {
        resolve(rows);
      }
    });
  });
}

async function initializeDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      document_type TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      thumbnail_name TEXT,
      mime_type TEXT NOT NULL,
      sha256 TEXT NOT NULL UNIQUE,
      uploaded_at TEXT NOT NULL,
      deleted_at TEXT
    )
  `);
}

async function findByHash(sha256) {
  return get('SELECT id FROM documents WHERE sha256 = ?', [sha256]);
}

async function insertDocument(document) {
  await run(
    `INSERT INTO documents
      (id, title, document_type, tags, original_name, stored_name,
       thumbnail_name, mime_type, sha256, uploaded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      document.id,
      document.title,
      document.documentType,
      JSON.stringify(document.tags),
      document.originalName,
      document.storedName,
      document.thumbnailName,
      document.mimeType,
      document.sha256,
      document.uploadedAt
    ]
  );
}

async function listDocuments(filters) {
  const conditions = ['deleted_at IS NULL'];
  const values = [];

  if (filters.type) {
    conditions.push('document_type = ?');
    values.push(filters.type);
  }

  if (filters.tag) {
    conditions.push('EXISTS (SELECT 1 FROM json_each(documents.tags) WHERE value = ?)');
    values.push(filters.tag);
  }

  if (filters.from) {
    conditions.push('date(uploaded_at) >= date(?)');
    values.push(filters.from);
  }

  if (filters.to) {
    conditions.push('date(uploaded_at) <= date(?)');
    values.push(filters.to);
  }

  const sql = `
    SELECT id, title, document_type, tags, original_name, mime_type,
           uploaded_at, thumbnail_name
    FROM documents
    WHERE ${conditions.join(' AND ')}
    ORDER BY uploaded_at DESC
  `;
  return all(sql, values);
}

async function getDocument(id) {
  return get('SELECT * FROM documents WHERE id = ?', [id]);
}

async function deleteDocument(id) {
  return run('DELETE FROM documents WHERE id = ?', [id]);
}

async function softDeleteDocument(id, deletedAt) {
  return run(
    'UPDATE documents SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL',
    [deletedAt, id]
  );
}

async function restoreDocument(id) {
  return run('UPDATE documents SET deleted_at = NULL WHERE id = ?', [id]);
}

export {
  deleteDocument,
  findByHash,
  getDocument,
  initializeDatabase,
  insertDocument,
  listDocuments,
  restoreDocument,
  softDeleteDocument
};
