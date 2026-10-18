import { errorResponse } from '../utils/responses.js';

export function errorHandler(error, _request, response, _next) {
  void _next;
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
    ? error.status
    : 500;

  if (status === 500) {
    console.error(error);
  }

  response.status(status).json(errorResponse(
    status === 500 ? 'Internal server error.' : error.message,
  ));
}
