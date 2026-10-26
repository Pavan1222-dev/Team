import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

function createError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function getFileType(contents) {
  if (contents.subarray(0, 5).toString() === '%PDF-') {
    return { extension: '.pdf', mimeType: 'application/pdf' };
  }

  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (contents.subarray(0, 8).equals(pngSignature)) {
    return { extension: '.png', mimeType: 'image/png' };
  }

  if (contents[0] === 0xff && contents[1] === 0xd8 && contents[2] === 0xff) {
    return { extension: '.jpg', mimeType: 'image/jpeg' };
  }

  return null;
}

async function inspectFile(filePath, originalName) {
  const contents = await readFile(filePath);
  const fileType = getFileType(contents);

  if (!fileType) {
    throw createError('File content is not a supported PDF, JPG, or PNG.');
  }

  const fileExtension = path.extname(originalName).toLowerCase();
  const allowedExtensions = fileType.extension === '.jpg'
    ? ['.jpg', '.jpeg']
    : [fileType.extension];

  if (!allowedExtensions.includes(fileExtension)) {
    throw createError('The file extension does not match its actual file type.');
  }

  const sha256 = createHash('sha256').update(contents).digest('hex');

  return { ...fileType, sha256 };
}

export default { inspectFile };