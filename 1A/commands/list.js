import { loadExpenses } from '../storage.js';

export async function listExpenses(options = {}) {
  let expenses = await loadExpenses();

  if (expenses.length === 0) {
    console.log('No expenses found.');
    return;
  }

  if (options.from) {
    expenses = expenses.filter(
      (expense) => expense.date >= options.from
    );
  }

  if (options.to) {
    expenses = expenses.filter(
      (expense) => expense.date <= options.to
    );
  }

  if (options.category) {
    expenses = expenses.filter(
      (expense) => expense.category.toLowerCase() === options.category.toLowerCase()
    );
  }

  if (options.minAmount !== undefined) {
    const minAmount = Number(options.minAmount);

    if (!Number.isFinite(minAmount) || minAmount < 0) {
      throw new Error('Minimum amount must be a non-negative number.');
    }

    expenses = expenses.filter(
      (expense) => expense.amount >= minAmount
    );
  }

  if (options.sort === 'date') {
    expenses.sort((a, b) => a.date.localeCompare(b.date));
  } else if (options.sort === 'amount') {
    expenses.sort((a, b) => a.amount - b.amount);
  }

  if (expenses.length === 0) {
    console.log('No expenses match your filters.');
    return;
  }

  console.table(expenses);
}
