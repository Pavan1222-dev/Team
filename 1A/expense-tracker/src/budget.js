import { loadBudgets } from './storage.js';
import { getMonth, formatCurrency } from './utils.js';

/**
 * Compute the total spent in a given category during a given month.
 * Returns a number.
 */
export function spentInCategoryMonth(expenses, category, month) {
  return expenses
    .filter(e => e.category === category && e.date.startsWith(month))
    .reduce((sum, e) => sum + e.amount, 0);
}

/**
 * Called after add/update. Prints a warning if the current month's
 * category total exceeds the configured budget.
 */
export async function checkBudget(expenses, category, date) {
  const budgets = await loadBudgets();
  const budget = budgets[category];
  if (budget == null) return;   // no budget set for this category

  const month = getMonth(date);
  const spent = spentInCategoryMonth(expenses, category, month);

  if (spent > budget) {
    const over = spent - budget;
    console.warn(
      `⚠️  Budget exceeded for ${category} in ${month}: ` +
      `${formatCurrency(spent)} / ${formatCurrency(budget)} ` +
      `(over by ${formatCurrency(over)})`
    );
  }
}