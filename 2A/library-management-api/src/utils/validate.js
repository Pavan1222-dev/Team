import { AppError } from './app-error.js';

export function validate(schema, value, source = 'body') {
  const result = schema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || source,
      message: issue.message,
    }));
    throw new AppError(400, 'Request validation failed', details);
  }
  return result.data;
}
