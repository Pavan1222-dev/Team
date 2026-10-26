import path from 'node:path';
import { createReadStream } from 'node:fs';
import documentService from '../services/documentService.js';

function sendFile(res, filePath, mimeType, fileName, disposition) {
  const encodedName = encodeURIComponent(fileName);

  res.setHeader('Content-Type', mimeType);
  res.setHeader(
    'Content-Disposition',
    `${disposition}; filename*=UTF-8''${encodedName}`
  );

  const stream = createReadStream(filePath);
  stream.on('error', (error) => {
    if (!res.headersSent) {
      res.status(404).json({ error: 'The file could not be found.' });
    } else {
      res.destroy(error);
    }
  });
  stream.pipe(res);
}

const documentController = {
  async upload(req, res) {
    const documents = await documentService.createDocuments(req.files, req.body);
    res.status(201).json({ message: 'Documents uploaded.', documents });
  },

  async list(req, res) {
    const documents = await documentService.listDocuments(req.query);
    res.json({ documents });
  },

  async download(req, res) {
    const document = await documentService.getDownload(req.params.id);
    sendFile(
      res,
      document.filePath,
      document.mimeType,
      path.basename(document.originalName),
      'attachment'
    );
  },

  async thumbnail(req, res) {
    const document = await documentService.getThumbnail(req.params.id);
    sendFile(res, document.filePath, 'image/jpeg', `${document.id}-thumbnail.jpg`, 'inline');
  },

  async remove(req, res) {
    await documentService.softDeleteDocument(req.params.id);
    res.json({ message: 'Document deleted. It can be restored within 7 days.' });
  },

  async restore(req, res) {
    await documentService.restoreDocument(req.params.id);
    res.json({ message: 'Document restored.' });
  }
};

export default documentController;