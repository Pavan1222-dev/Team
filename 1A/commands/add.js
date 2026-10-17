import {loadExpenses,saveExpenses} from '../storage.js';
import { loadBudgets } from '../budget.js';
import {
  validateAmount,
  validateDate,
  validateCategory,
  validateDescription,
  validatePaymentMode
} from '../validation.js';

export async function addExpense(options) {
  const expense = {
    id: Date.now(),
    date: validateDate(options.date),
    amount: validateAmount(options.amount),
    category: validateCategory(options.category),
    description: validateDescription(options.description),
    paymentMode: validatePaymentMode(options.paymentMode)
  };
  
    
    const expenses = await loadExpenses();

//budgets check before pushing the expense
  const budgets = await loadBudgets();

  const currentMonth = expense.date.slice(0, 7);

  const categoryExpenses = expenses.filter(item =>
    item.category === expense.category &&
    item.date.startsWith(currentMonth)
  );

  const currentTotal = categoryExpenses.reduce(
      (total, item) => total + item.amount, 0
  );

  const budget = budgets[expense.category];

  if (budget !== undefined && currentTotal + expense.amount > budget) {
    console.warn(`Warning: This expense exceeds the monthly ${expense.category} budget of ₹${budget}.`);
  }

// push expense into expenses
    expenses.push(expense);

//save expenses
    await saveExpenses(expenses);
    console.log('Expense added successfully:');
    console.log(expense);
}