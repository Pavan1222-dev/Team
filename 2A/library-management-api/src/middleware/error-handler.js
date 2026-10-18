import { AppError } from '../utils/app-error.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, data: null, error: { message: `Route ${req.method} ${req.originalUrl} not found`, details: null } });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const isMalformedJson = error instanceof SyntaxError && error.status === 400 && 'body' in error;
  const status = error instanceof AppError ? error.status : isMalformedJson ? 400 : 500;
  const message = status === 500 ? 'An unexpected error occurred' : error.message;
  if (status === 500) console.error(error);
  return res.status(status).json({ success: false, data: null, error: { message, details: error.details ?? null } });
}
