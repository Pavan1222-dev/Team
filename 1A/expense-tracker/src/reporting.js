// src/reporting.js
import { getMonth } from './utils.js';

/**
 * Apply optional filters to an expense array.
 * Any filter that is undefined/null is skipped.
 * Returns a new array (does not mutate input).
 */
export function applyFilters(expenses, filters = {}) {
  let result = [...expenses];

  if (filters.from) {
    result = result.filter(e => e.date >= filters.from);
  }
  if (filters.to) {
    result = result.filter(e => e.date <= filters.to);
  }
  if (filters.category) {
    result = result.filter(e => e.category === filters.category);
  }
  if (filters.min != null) {
    result = result.filter(e => e.amount >= filters.min);
  }

  return result;
}

/**
 * Sort an expense array by "date" or "amount".
 * Returns a new array (does not mutate input).
 */
export function sortExpenses(expenses, field = 'date', order = 'desc') {
  const dir = order === 'asc' ? 1 : -1;
  const key = field === 'amount' ? 'amount' : 'date';

  return [...expenses].sort((a, b) => {
    if (a[key] < b[key]) return -1 * dir;
    if (a[key] > b[key]) return 1 * dir;
    return 0;
  });
}

/**
 * Sum expenses per category.
 * Returns { food: 1250, transport: 400, ... }
 */
export function groupByCategory(expenses) {
  const totals = {};
  for (const e of expenses) {
    totals[e.category] = (totals[e.category] || 0) + e.amount;
  }
  return totals;
}

/**
 * Sum expenses per month.
 * Returns { "2025-01": 1500, "2025-02": 800, ... }
 */
export function groupByMonth(expenses) {
  const totals = {};
  for (const e of expenses) {
    const month = getMonth(e.date);
    totals[month] = (totals[month] || 0) + e.amount;
  }
  return totals;
}

/**
 * Find the single largest expense.
 * Returns the full expense object, or null if empty.
 */
export function findHighest(expenses) {
  if (expenses.length === 0) return null;
  return expenses.reduce((max, e) => (e.amount > max.amount ? e : max));
}

/**
 * Grand total across all given expenses.
 */
export function totalAmount(expenses) {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

/**
 * Filter + sort in one call.
 * Convenience wrapper used by list & export.
 */
export function filterAndSort(expenses, filters = {}, sortField = 'date', order = 'desc') {
  const filtered = applyFilters(expenses, filters);
  return sortExpenses(filtered, sortField, order);
}