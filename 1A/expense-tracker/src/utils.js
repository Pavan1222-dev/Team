// src/utils.js

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function getMonth(dateStr) {
  return dateStr.slice(0, 7);   // "2025-01-15" → "2025-01"
}

export function formatCurrency(amount) {
  return `₹${Number(amount).toFixed(2)}`;
}

export function shortId(id) {
  return id.slice(0, 8);
}

export function csvEscape(value) {
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}