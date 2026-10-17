
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadExpenses } from '../storage.js';

export async function exportExpenses(options = {}) {
    let expenses = await loadExpenses();

    if (options.from) {
        expenses = expenses.filter(expense => expense.date >= options.from);
    }

    if (options.to) {
        expenses = expenses.filter(expense => expense.date <= options.to);
    }

    if (options.category) {
        expenses = expenses.filter(
            expense =>
                expense.category.toLowerCase() === options.category.toLowerCase()
        );
    }

    if (options.minAmount !== undefined) {
        const minAmount = Number(options.minAmount);

        if (!Number.isFinite(minAmount) || minAmount < 0) {
            throw new Error('Minimum amount must be a non-negative number.');
        }

        expenses = expenses.filter(expense => expense.amount >= minAmount);
    }

    if (expenses.length === 0) {
        console.log('No expenses match the export filters.');
        return;
    }

    const headers = [
        'id',
        'date',
        'amount',
        'category',
        'description',
        'paymentMode'
    ];

    // Escape commas, quotes and newlines in CSV values.
    const escapeCSV = value => {
        const text = String(value ?? '');
        return `"${text.replace(/"/g, '""')}"`;
    };

    const rows = expenses.map(expense =>
        headers.map(header => escapeCSV(expense[header])).join(',')
    );

    const csvContent = [headers.join(','), ...rows].join('\n');

    const outputFile = path.resolve(
        options.output || 'expenses.csv'
    );

    await fs.writeFile(outputFile, csvContent, 'utf-8');

    console.log(`Exported ${expenses.length} expenses to ${outputFile}`);
}
