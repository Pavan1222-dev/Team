import { getExpenses, saveExpenses } from '../modules/storage.js';
import { validateUpdateInput } from '../modules/validation.js';

export async function updateExpense(id, options) {
  const updates = validateUpdateInput(options);
  const allExpenses = await getExpenses();
  const expense = allExpenses.find(item => item.id === id);

  if (!expense) throw new Error(`No expense found with ID "${id}".`);

  Object.assign(expense, updates);
  await saveExpenses(allExpenses);
  console.log('Expense updated.');
}