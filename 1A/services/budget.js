import { getBudgets, saveBudgets } from '../modules/storage.js';
import { validateBudgetInput } from '../modules/validation.js';

export async function setBudget(category, amount) {
  const budget = validateBudgetInput(category, amount);
  const budgets = await getBudgets();
  budgets[budget.category] = budget.amount;
  await saveBudgets(budgets);
  console.log(`Monthly budget for ${budget.category} set to ${budget.amount.toFixed(2)}.`);
}

export async function listBudgets() {
  const budgets = await getBudgets();
  const entries = Object.entries(budgets).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) {
    console.log('No monthly budgets set.');
    return;
  }
  console.table(entries.map(([category, amount]) => ({ category, monthlyBudget: amount })));
}

export async function deleteBudget(category) {
  validateBudgetInput(category, 0);
  const budgets = await getBudgets();
  if (budgets[category] === undefined) {
    throw new Error(`No monthly budget is set for "${category}".`);
  }
  delete budgets[category];
  await saveBudgets(budgets);
  console.log(`Monthly budget for ${category} deleted.`);
}
