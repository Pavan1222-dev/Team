
const CATEGORIES = [
  "food",
  "travel",
  "shopping",
  "bills",
  "health",
  "education",
  "entertainment",
  "utilities",
  "salary",
  "other"
];

const PAYMENT_MODES = [
  "cash",
  "upi",
  "card",
  "bank-transfer",
  "other"
];

function validateId(value) {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("ID must be a positive integer.");
  }

  return id;
}

function validateAmount(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number.");
  }

  if (Math.round(amount * 100) / 100 !== amount) {
    throw new Error("Amount cannot have more than two decimal places.");
  }

  return amount;
}

function validateMinimumAmount(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Minimum amount must be zero or greater.");
  }

  return amount;
}

function validateDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Date must use YYYY-MM-DD format.");
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`Invalid date: ${value}`);
  }

  return value;
}

function validateDateRange(from, to) {
  const start = from ? validateDate(from) : undefined;
  const end = to ? validateDate(to) : undefined;

  if (start && end && start > end) {
    throw new Error("Start date cannot be after end date.");
  }

  return { from: start, to: end };
}

function validateCategory(value) {
  const category = String(value).trim().toLowerCase();

  if (!CATEGORIES.includes(category)) {
    throw new Error(
      `Unknown category "${value}". Allowed: ${CATEGORIES.join(", ")}`
    );
  }

  return category;
}

function validatePaymentMode(value) {
  const mode = String(value).trim().toLowerCase();

  if (!PAYMENT_MODES.includes(mode)) {
    throw new Error(
      `Unknown payment mode "${value}". Allowed: ${PAYMENT_MODES.join(", ")}`
    );
  }

  return mode;
}

function validateDescription(value) {
  const description = String(value).trim();

  if (!description) {
    throw new Error("Description cannot be empty.");
  }

  if (description.length > 500) {
    throw new Error("Description cannot exceed 500 characters.");
  }

  return description;
}

module.exports = {
  CATEGORIES,
  PAYMENT_MODES,
  validateId,
  validateAmount,
  validateMinimumAmount,
  validateDate,
  validateDateRange,
  validateCategory,
  validatePaymentMode,
  validateDescription
};
