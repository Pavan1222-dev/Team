
import { loadExpenses, saveExpenses } from '../storage.js';

export async function deleteExpense(id) {
    const expenses = await loadExpenses();

    const expenseId = Number(id);

    if (!Number.isSafeInteger(expenseId) || expenseId <= 0) {
        throw new Error('Expense ID must be a positive integer.');
    }

    const index = expenses.findIndex(
        expense => expense.id === expenseId
    );

    if (index === -1) {
        throw new Error(`Expense with ID ${id} not found.`);
    }

    const [deletedExpense] = expenses.splice(index, 1);

    await saveExpenses(expenses);

    console.log('Expense deleted successfully:');
    console.log(deletedExpense);
}
