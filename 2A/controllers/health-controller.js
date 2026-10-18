import { successResponse } from '../utils/responses.js';

export function getHealth(_request, response) {
  response.json(successResponse({ status: 'ok' }));
}
