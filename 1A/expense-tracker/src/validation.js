export const CATEGORIES = ['food', 'transport', 'utilities', 'entertainment', 'other'];
export const PAYMENT_MODES = ['cash', 'card', 'upi', 'netbanking'];

export function validateAmount(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) {
    console.error(`❌ Amount must be a positive number (got: ${v})`);
    process.exit(1);
  }
  return n;
}

export function validateDate(v) {
  const d = new Date(v);
  if (isNaN(d.getTime())) {
    console.error(`❌ Invalid date: ${v} (use YYYY-MM-DD)`);
    process.exit(1);
  }
  return d.toISOString().slice(0, 10);
}

export function validateCategory(v) {
  if (!CATEGORIES.includes(v)) {
    console.error(`❌ Unknown category "${v}". Allowed: ${CATEGORIES.join(', ')}`);
    process.exit(1);
  }
  return v;
}

export function validatePaymentMode(v) {
  if (!PAYMENT_MODES.includes(v)) {
    console.error(`❌ Unknown payment mode "${v}". Allowed: ${PAYMENT_MODES.join(', ')}`);
    process.exit(1);
  }
  return v;
}