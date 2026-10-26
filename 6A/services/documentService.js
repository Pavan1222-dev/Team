import { randomUUID } from 'node:crypto';
import { rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import fileSecurity from './fileSecurity.js';
import {
  deleteDocument,
  findByHash,
  getDocument,
  insertDocument,
  listDocuments as findDocuments,
  restoreDocument as restoreDocumentRow,
  softDeleteDocument as softDeleteDocumentRow
} from '../data_access/db.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const uploadDirectory = path.resolve(currentDirectory, '..', 'uploads');
const restoreWindowMs = 7 * 24 * 60 * 60 * 1000;

function createError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parseTags(value) {
  if (!value) {
    return [];
  }

  return [...new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean))];
}

function validateDate(value, name) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value) {
    throw createError(`The ${name} date must use YYYY-MM-DD format.`);
  }
}

function toPublicDocument(row) {
  return {
    id: row.id,
    title: row.title,
    documentType: row.document_type,
    tags: JSON.parse(row.tags),
    originalName: row.original_name,
    mimeType: row.mime_type,
    uploadedAt: row.uploaded_at,
    thumbnailUrl: row.thumbnail_name ? `/documents/${row.id}/thumbnail` : null
  };
}

async function removeFiles(filePaths) {
  for (const filePath of filePaths) {
    await unlink(filePath).catch((error) => {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    });
  }
}

async function createDocuments(files, metadata = {}) {
  const title = typeof metadata.title === 'string' ? metadata.title.trim() : '';
  const documentType = typeof metadata.documentType === 'string'
    ? metadata.documentType.trim()
    : '';
  const tags = parseTags(typeof metadata.tags === 'string' ? metadata.tags : '');
  const stagedPaths = (files || []).map((file) => file.path);
  const storedPaths = [];
  const createdIds = [];

  try {
    if (!files || files.length === 0) {
      throw createError('Choose at least one file using the "files" field.');
    }

    if (!title || !documentType) {
      throw createError('The title and documentType fields are required.');
    }

    const inspectedFiles = [];
    const hashesInRequest = new Set();

    for (const file of files) {
      const details = await fileSecurity.inspectFile(file.path, file.originalname);

      if (hashesInRequest.has(details.sha256) || await findByHash(details.sha256)) {
        throw createError(`A file with the same content has already been uploaded: ${file.originalname}`, 409);
      }

      hashesInRequest.add(details.sha256);
      inspectedFiles.push({ file, details });
    }

    const documents = [];

    for (const { file, details } of inspectedFiles) {
      const id = randomUUID();
      const storedName = `${id}${details.extension}`;
      const storedPath = path.join(uploadDirectory, storedName);
      const isImage = details.mimeType.startsWith('image/');
      const thumbnailName = isImage ? `${id}-thumbnail.jpg` : null;
      const thumbnailPath = thumbnailName ? path.join(uploadDirectory, thumbnailName) : null;

      if (thumbnailPath) {
        storedPaths.push(thumbnailPath);
        await sharp(file.path).resize({ width: 200 }).jpeg().toFile(thumbnailPath);
      }

      await rename(file.path, storedPath);
      storedPaths.push(storedPath);

      const document = {
        id,
        title,
        documentType,
        tags,
        originalName: path.basename(file.originalname),
        storedName,
        thumbnailName,
        mimeType: details.mimeType,
        sha256: details.sha256,
        uploadedAt: new Date().toISOString()
      };

      await insertDocument(document);
      createdIds.push(id);
      documents.push({
        id: document.id,
        title: document.title,
        documentType: document.documentType,
        tags: document.tags,
        originalName: document.originalName,
        mimeType: document.mimeType,
        uploadedAt: document.uploadedAt,
        thumbnailUrl: thumbnailName ? `/documents/${id}/thumbnail` : null
      });
    }

    return documents;
  } catch (error) {
    for (const id of createdIds) {
      await deleteDocument(id);
    }

    await removeFiles([...stagedPaths, ...storedPaths]);
    throw error;
  }
}

async function listDocuments(query) {
  const filters = {
    type: typeof query.type === 'string' ? query.type.trim() : '',
    tag: typeof query.tag === 'string' ? query.tag.trim() : '',
    from: typeof query.from === 'string' ? query.from : '',
    to: typeof query.to === 'string' ? query.to : ''
  };

  if (filters.from) {
    validateDate(filters.from, 'from');
  }
  if (filters.to) {
    validateDate(filters.to, 'to');
  }
  if (filters.from && filters.to && filters.from > filters.to) {
    throw createError('The from date must be on or before the to date.');
  }

  const rows = await findDocuments(filters);
  return rows.map(toPublicDocument);
}

async function getActiveDocument(id) {
  const document = await getDocument(id);

  if (!document || document.deleted_at) {
    throw createError('Document not found.', 404);
  }

  return document;
}

async function getDownload(id) {
  const document = await getActiveDocument(id);
  return {
    filePath: path.join(uploadDirectory, document.stored_name),
    originalName: document.original_name,
    mimeType: document.mime_type
  };
}

async function getThumbnail(id) {
  const document = await getActiveDocument(id);

  if (!document.thumbnail_name) {
    throw createError('This document does not have a thumbnail.', 404);
  }

  return {
    id: document.id,
    filePath: path.join(uploadDirectory, document.thumbnail_name)
  };
}

async function softDeleteDocument(id) {
  const document = await getActiveDocument(id);
  const result = await softDeleteDocumentRow(id, new Date().toISOString());

  if (result.changes === 0) {
    throw createError('Document not found.', 404);
  }
  return document;
}

async function restoreDocument(id) {
  const document = await getDocument(id);

  if (!document || !document.deleted_at) {
    throw createError('Deleted document not found.', 404);
  }

  const deletedAt = new Date(document.deleted_at).getTime();
  if (Date.now() - deletedAt > restoreWindowMs) {
    throw createError('The 7-day restore period has ended.', 410);
  }

  await restoreDocumentRow(id);
}

export default {
  createDocuments,
  getDownload,
  getThumbnail,
  listDocuments,
  restoreDocument,
  softDeleteDocument
};