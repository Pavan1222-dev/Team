import { loadExpenses } from '../storage.js';
import {
  groupByCategory, groupByMonth, findHighest, totalAmount,
} from '../reporting.js';
import { formatCurrency, shortId } from '../utils.js';

export function registerSummary(program) {
  program
    .command('summary')
    .description('Show totals per category, per month, and highest expense')
    .option('--month <YYYY-MM>', 'Limit to a specific month')
    .action(async (opts) => {
      let expenses = await loadExpenses();

      if (expenses.length === 0) {
        console.log('ℹ️  No expenses to summarize.');
        return;
      }

      // Optional month filter
      if (opts.month) {
        if (!/^\d{4}-\d{2}$/.test(opts.month)) {
          console.error(`❌ --month must be YYYY-MM (got: ${opts.month})`);
          process.exit(1);
        }
        expenses = expenses.filter(e => e.date.startsWith(opts.month));
        if (expenses.length === 0) {
          console.log(`ℹ️  No expenses in ${opts.month}.`);
          return;
        }
      }

      const grandTotal = totalAmount(expenses);

      // --- Per category ---
      console.log(`\n📊 By category${opts.month ? ` (${opts.month})` : ''}:`);
      const byCat = groupByCategory(expenses);
      for (const [cat, total] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
        const pct = ((total / grandTotal) * 100).toFixed(1);
        console.log(`  ${cat.padEnd(15)} ${formatCurrency(total).padStart(10)}  (${pct}%)`);
      }

      // --- Per month ---
      console.log(`\n📅 By month:`);
      const byMonth = groupByMonth(expenses);
      for (const [month, total] of Object.entries(byMonth).sort()) {
        console.log(`  ${month}  ${formatCurrency(total).padStart(10)}`);
      }

      // --- Highest single expense ---
      const highest = findHighest(expenses);
      console.log(`\n🏆 Highest single expense:`);
      console.log(`  ${formatCurrency(highest.amount)} — ${highest.category} — "${highest.description}" (${highest.date}, id: ${shortId(highest.id)})`);

      // --- Grand total ---
      console.log(`\n💰 Grand total: ${formatCurrency(grandTotal)}`);
    });
}