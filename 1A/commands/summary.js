
import { loadExpenses } from '../storage.js';

export async function showSummary() {
    const expenses = await loadExpenses();

    if (expenses.length === 0) {
        console.log('No expenses available to summarize.');
        return;
    }

    let grandTotal = 0;
    const categoryTotals = {};
    const monthlyTotals = {};

    for (const expense of expenses) {
        grandTotal += expense.amount;

        // Total spending per category
        categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;

        // Total spending per month (YYYY-MM)
        const month = expense.date.slice(0, 7);

        monthlyTotals[month] = (monthlyTotals[month] || 0) + expense.amount;
    }

    const highestExpense = expenses.reduce((highest, expense) =>
        expense.amount > highest.amount ? expense : highest
    );

    console.log('\n===== EXPENSE SUMMARY =====');
    console.log(`Total spending: ₹${grandTotal.toFixed(2)}`);

    console.log('\nSpending by category:');
    console.table(
        Object.entries(categoryTotals).map(([category, total]) => ({
            category,
            total: `₹${total.toFixed(2)}`
        }))
    );

    console.log('\nSpending by month:');
    console.table(
        Object.entries(monthlyTotals).map(([month, total]) => ({
            month,
            total: `₹${total.toFixed(2)}`
        }))
    );

    console.log('\nHighest single expense:');
    console.table([highestExpense]);
}
