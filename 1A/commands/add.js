import {loadExpenses,saveExpenses} from '../storage.js';
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
    expenses.push(expense);


    await saveExpenses(expenses);
    console.log('Expense added successfully:');
    console.log(expense);
}