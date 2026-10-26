export const ALLOWED_CATEGORIES = ['Food', 'Travel', 'Shopping', 'Bills', 'Other'];

export function validateDate(value, label = 'Date') {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be a valid date in YYYY-MM-DD format.`);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} must be a valid date in YYYY-MM-DD format.`);
  }

  return value;
}

function validateAmount(value, label = 'Amount', allowZero = false) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || (allowZero ? amount < 0 : amount <= 0)) {
    throw new Error(`${label} must be a ${allowZero ? 'non-negative' : 'positive'} number.`);
  }
  return amount;
}

export function validateCategory(category) {
  if (!ALLOWED_CATEGORIES.includes(category)) {
    throw new Error(`Unknown category "${category}". Choose one of: ${ALLOWED_CATEGORIES.join(', ')}.`);
  }
  return category;
}

export function validateAddInput(options) {
  const paymentMode = options.payment?.trim();
  if (!paymentMode) throw new Error('Payment mode must not be empty.');
  if (typeof options.description !== 'string') throw new Error('Description must be text.');

  return {
    amount: validateAmount(options.amount),
    category: validateCategory(options.category),
    date: options.date ? validateDate(options.date) : today(),
    description: options.description,
    paymentMode
  };
}

function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function validateUpdateInput(options) {
  const updates = {};

  if (options.amount !== undefined) updates.amount = validateAmount(options.amount);
  if (options.category !== undefined) updates.category = validateCategory(options.category);
  if (options.date !== undefined) updates.date = validateDate(options.date);
  if (options.description !== undefined) updates.description = options.description;
  if (options.payment !== undefined) {
    if (typeof options.payment !== 'string' || options.payment.trim() === '') {
      throw new Error('Payment mode must not be empty.');
    }
    updates.paymentMode = options.payment.trim();
  }
  if (Object.keys(updates).length === 0) {
    throw new Error('Provide at least one field to update.');
  }

  return updates;
}

export function validateListOptions(options) {
  const from = options.from ? validateDate(options.from, 'Start date') : undefined;
  const to = options.to ? validateDate(options.to, 'End date') : undefined;

  if (from && to && from > to) {
    throw new Error('Start date must be on or before end date.');
  }

  return {
    category: options.category ? validateCategory(options.category) : undefined,
    min: options.min !== undefined ? validateAmount(options.min, 'Minimum amount', true) : undefined,
    from,
    to,
    sort: options.sort ?? 'date'
  };
}

export function validateBudgetInput(category, amount) {
  return {
    category: validateCategory(category),
    amount: validateAmount(amount, 'Budget', true)
  };
}
