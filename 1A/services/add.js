import { getExpenses, getBudgets, saveExpenses } from '../modules/storage.js';
import { validateAddInput } from '../modules/validation.js';

export async function addExpense(options) {
  const validated = validateAddInput(options);
  const allExpenses = await getExpenses();
  const budgets = await getBudgets();
  const newExpense = {
    id: Date.now().toString(),
    date: validated.date,
    amount: validated.amount,
    category: validated.category,
    description: validated.description,
    paymentMode: validated.paymentMode
  };

  allExpenses.push(newExpense);
  await saveExpenses(allExpenses);
  console.log(`Expense added with ID: ${newExpense.id}`);

  const budget = budgets[newExpense.category];
  if (budget !== undefined) {
    const month = newExpense.date.slice(0, 7);
    const monthlyTotal = allExpenses
      .filter(expense => expense.category === newExpense.category && expense.date.startsWith(month))
      .reduce((total, expense) => total + expense.amount, 0);
    if (monthlyTotal > budget) {
      console.warn(`Warning: ${newExpense.category} expenses for ${month} total ${monthlyTotal.toFixed(2)}, exceeding the monthly budget of ${budget.toFixed(2)}.`);
    }
  }
}
