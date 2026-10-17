
import { loadExpenses, saveExpenses } from '../storage.js';

import {
    validateAmount,
    validateDate,
    validateCategory,
    validateDescription,
    validatePaymentMode
} from '../validation.js';

export async function updateExpense(id, options) {
    const expenses = await loadExpenses();

    const expenseId = Number(id);

    const expense = expenses.find(item => item.id === expenseId);

    if (!expense) {
        throw new Error(`Expense with ID ${id} not found.`);
    }

    if (options.date !== undefined) {
        expense.date = validateDate(options.date);
    }

    if (options.amount !== undefined) {
        expense.amount = validateAmount(options.amount);
    }

    if (options.category !== undefined) {
        expense.category = validateCategory(options.category);
    }

    if (options.description !== undefined) {
        expense.description = validateDescription(options.description);
    }

    if (options.paymentMode !== undefined) {
        expense.paymentMode = validatePaymentMode(options.paymentMode);
    }

    await saveExpenses(expenses);

    console.log('Expense updated successfully:');
    console.log(expense);
}
