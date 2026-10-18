import { AppError } from './app-error.js';

export function paginateAndSort(items, query, allowedSortFields) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 10);
  const sortBy = query.sortBy ?? 'createdAt';
  const order = (query.order ?? 'asc').toLowerCase();
  if (!Number.isInteger(page) || page < 1) throw new AppError(400, 'Invalid query parameters', [{ field: 'page', message: 'Must be a positive integer' }]);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new AppError(400, 'Invalid query parameters', [{ field: 'limit', message: 'Must be an integer between 1 and 100' }]);
  if (!allowedSortFields.includes(sortBy)) throw new AppError(400, 'Invalid query parameters', [{ field: 'sortBy', message: `Must be one of: ${allowedSortFields.join(', ')}` }]);
  if (!['asc', 'desc'].includes(order)) throw new AppError(400, 'Invalid query parameters', [{ field: 'order', message: 'Must be asc or desc' }]);

  const sorted = [...items].sort((a, b) => {
    const left = a[sortBy] ?? '';
    const right = b[sortBy] ?? '';
    const comparison = typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left).localeCompare(String(right), undefined, { sensitivity: 'base' });
    return order === 'asc' ? comparison : -comparison;
  });
  const total = sorted.length;
  return {
    items: sorted.slice((page - 1) * limit, page * limit),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
