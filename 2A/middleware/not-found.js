import { errorResponse } from '../utils/responses.js';

export function notFound(_request, response) {
  response.status(404).json(errorResponse('Route not found.'));
}
