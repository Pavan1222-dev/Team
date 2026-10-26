import fs from 'node:fs/promises';
import path from 'node:path';

export function getFilteredList(expenses, filters = {}) {
  const { category, min, from, to, sort = 'date' } = filters;
  const filtered = expenses.filter(expense => (
    (!category || expense.category === category)
    && (min === undefined || expense.amount >= min)
    && (!from || expense.date >= from)
    && (!to || expense.date <= to)
  ));

  if (sort === 'amount') {
    filtered.sort((a, b) => b.amount - a.amount || b.date.localeCompare(a.date));
  } else {
    filtered.sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount);
  }
  return filtered;
}

export function printSummary(expenses) {
  const categoryTotals = new Map();
  const monthlyTotals = new Map();
  let highest;

  for (const expense of expenses) {
    categoryTotals.set(expense.category, (categoryTotals.get(expense.category) ?? 0) + expense.amount);
    const month = expense.date.slice(0, 7);
    monthlyTotals.set(month, (monthlyTotals.get(month) ?? 0) + expense.amount);
    if (!highest || expense.amount > highest.amount) highest = expense;
  }

  console.log('--- EXPENSE SUMMARY ---');
  console.log('Totals by category:');
  if (categoryTotals.size === 0) console.log('  No expenses recorded.');
  for (const [category, total] of [...categoryTotals].sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`  ${category}: ${total.toFixed(2)}`);
  }
  console.log('Totals by month:');
  if (monthlyTotals.size === 0) console.log('  No expenses recorded.');
  for (const [month, total] of [...monthlyTotals].sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`  ${month}: ${total.toFixed(2)}`);
  }
  if (highest) {
    console.log(`Highest single expense: ${highest.amount.toFixed(2)} (${highest.category}, ${highest.date})`);
  } else {
    console.log('Highest single expense: None');
  }
}

function escapeCsv(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function exportCsv(expenses, output = 'export.csv') {
  const outputPath = path.resolve(output);
  const rows = [
    ['id', 'date', 'amount', 'category', 'description', 'paymentMode'],
    ...expenses.map(expense => [
      expense.id,
      expense.date,
      expense.amount,
      expense.category,
      expense.description,
      expense.paymentMode
    ])
  ];
  const csv = `${rows.map(row => row.map(escapeCsv).join(',')).join('\r\n')}\r\n`;

  try {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, csv, 'utf8');
  } catch (error) {
    throw new Error(`Cannot write CSV file at ${outputPath}: ${error.message}`);
  }
  console.log(`Exported ${expenses.length} expense(s) to ${outputPath}`);
}
