import { HttpError } from '../middleware/error-handler.js';

export function validateWith(validator) {
  return (request, _response, next) => {
    try {
      request.validated = validator(request);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, `${label} must be a JSON object.`);
  }
  return value;
}

export function rejectUnknownKeys(value, allowed, label) {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    throw new HttpError(400, `Unsupported ${label} field: ${unknown[0]}.`);
  }
}

export function positiveId(value, field) {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return String(value);
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) {
    const maximumBigint = '9223372036854775807';
    if (value.length < maximumBigint.length
      || (value.length === maximumBigint.length && value <= maximumBigint)) return value;
  }
  throw new HttpError(400, `${field} must be a positive integer.`);
}

export function requiredText(value, field, maxLength) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpError(400, `${field} is required and must be non-empty text.`);
  }
  const normalized = value.trim();
  if (maxLength && normalized.length > maxLength) {
    throw new HttpError(400, `${field} must be at most ${maxLength} characters.`);
  }
  return normalized;
}

export function optionalText(value, field, maxLength, { nullable = false } = {}) {
  if (nullable && value === null) return null;
  if (typeof value !== 'string') throw new HttpError(400, `${field} must be text${nullable ? ' or null' : ''}.`);
  const normalized = value.trim();
  if (!normalized && nullable) return null;
  if (!normalized) throw new HttpError(400, `${field} must be non-empty text.`);
  if (maxLength && normalized.length > maxLength) {
    throw new HttpError(400, `${field} must be at most ${maxLength} characters.`);
  }
  return normalized;
}

export function optionalDate(value, field) {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, `${field} must use YYYY-MM-DD format.`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.getUTCFullYear() === 0 || parsed.toISOString().slice(0, 10) !== value) {
    throw new HttpError(400, `${field} must be a valid calendar date.`);
  }
  return value;
}

export function pagination(query) {
  const pageValue = query.page ?? '1';
  const limitValue = query.limit ?? '10';
  if (typeof pageValue !== 'string' || !/^[1-9]\d*$/.test(pageValue)) {
    throw new HttpError(400, 'page must be a positive integer.');
  }
  if (typeof limitValue !== 'string' || !/^[1-9]\d*$/.test(limitValue)) {
    throw new HttpError(400, 'limit must be a positive integer.');
  }
  const page = Number(pageValue);
  const limit = Number(limitValue);
  if (!Number.isSafeInteger(page)) throw new HttpError(400, 'page must be a positive integer.');
  if (!Number.isSafeInteger(limit) || limit > 100) {
    throw new HttpError(400, 'limit must be an integer from 1 to 100.');
  }
  const offset = (page - 1) * limit;
  if (!Number.isSafeInteger(offset)) throw new HttpError(400, 'page and limit produce an unsupported offset.');
  return { page, limit, offset };
}

export function sorting(query, allowedFields, defaultField) {
  const sortBy = query.sortBy ?? defaultField;
  const order = String(query.order ?? 'asc').toLowerCase();
  if (!allowedFields.includes(sortBy)) {
    throw new HttpError(400, `sortBy must be one of: ${allowedFields.join(', ')}.`);
  }
  if (!['asc', 'desc'].includes(order)) throw new HttpError(400, 'order must be asc or desc.');
  return { sortBy, order };
}
