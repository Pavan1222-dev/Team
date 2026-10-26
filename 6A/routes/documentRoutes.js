import { Router } from 'express';
import documentController from '../controllers/documentController.js';
import upload from '../middlewares/uploadMiddleware.js';

const router = Router();

router.post('/', upload.array('files'), documentController.upload);
router.get('/', documentController.list);
router.get('/:id/download', documentController.download);
router.get('/:id/thumbnail', documentController.thumbnail);
router.delete('/:id', documentController.remove);
router.post('/:id/restore', documentController.restore);

export default router;