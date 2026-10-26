import { getExpenses, saveExpenses } from '../modules/storage.js';

export async function deleteExpense(id) {
  const allExpenses = await getExpenses();
  const remainingExpenses = allExpenses.filter(expense => expense.id !== id);

  if (allExpenses.length === remainingExpenses.length) {
    throw new Error(`No expense found with ID "${id}".`);
  }

  await saveExpenses(remainingExpenses);
  console.log('Expense deleted.');
}