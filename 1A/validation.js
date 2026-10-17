
export function validateAmount(amount) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Amount must be a valid number greater than zero.');
  }

  return numericAmount;
}

export function validateDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Date must use YYYY-MM-DD format.');
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime()) ||parsedDate.toISOString().slice(0, 10) !== date) {
    throw new Error('Please enter a valid calendar date.');
  }

  return date;
}

export function validateCategory(category) {
  const allowedCategories = [
    'Food',
    'Transport',
    'Shopping',
    'Bills',
    'Entertainment',
    'Health',
    'Other'
  ];

  if (
    typeof category !== 'string' ||
    !allowedCategories.includes(category.trim())
  ) {
    throw new Error(
      `Category must be one of: ${allowedCategories.join(', ')}.`
    );
  }

  return category.trim();
}

export function validateDescription(description) {
  if (typeof description !== 'string' || !description.trim()) {
    throw new Error('Description cannot be empty.');
  }

  return description.trim();
}


export function validatePaymentMode(paymentMode) {
  const allowedModes = ['Cash', 'UPI', 'Card', 'Bank Transfer'];

  if (
    typeof paymentMode !== 'string' ||
    !allowedModes.includes(paymentMode.trim())
  ) {
    throw new Error(
      `Payment mode must be one of: ${allowedModes.join(', ')}.`
    );
  }

  return paymentMode.trim();
}