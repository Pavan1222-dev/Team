export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export function notFound(_request, response) {
  response.status(404).json({ error: 'Route not found.' });
}

function mapDatabaseError(error) {
  if (error.code === '23505') return new HttpError(409, 'A record with these unique values already exists.');
  if (error.code === '23503') {
    if (error.constraint === 'employees_department_id_fkey') {
      return new HttpError(404, 'Department not found.');
    }
    if (error.constraint === 'employees_manager_id_fkey') {
      return new HttpError(404, 'Manager not found.');
    }
    return new HttpError(409, 'This record is referenced by other records and cannot be deleted.');
  }
  if (error.code === '23001') return new HttpError(409, 'This record is referenced by other records and cannot be deleted.');
  if (['23502', '23514', '22001', '22003', '22007', '22P02'].includes(error.code)) {
    return new HttpError(400, 'The supplied values violate a data constraint.');
  }
  return null;
}

export function errorHandler(error, _request, response, _next) {
  const safeError = error instanceof HttpError ? error : mapDatabaseError(error);
  const status = safeError?.status ?? (
    Number.isInteger(error.status) && error.status >= 400 && error.status < 600
      ? error.status
      : 500
  );
  const message = safeError?.message
    ?? (status < 500 ? error.message : (error.safeMessage ?? 'Internal server error.'));

  response.status(status).json({ error: message });
}
