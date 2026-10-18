import { loadExpenses } from '../storage.js';
import { filterAndSort } from '../reporting.js';
import { formatCurrency, shortId } from '../utils.js';
import { validateDate, validateCategory } from '../validation.js';

export function registerList(program) {
  program
    .command('list')
    .description('List expenses with optional filters and sorting')
    .option('--from <YYYY-MM-DD>', 'Start date (inclusive)')
    .option('--to <YYYY-MM-DD>', 'End date (inclusive)')
    .option('--category <name>', 'Filter by category')
    .option('--min <number>', 'Minimum amount')
    .option('--sort <field>', 'Sort by "date" or "amount"', 'date')
    .option('--order <dir>', 'Sort order "asc" or "desc"', 'desc')
    .action(async (opts) => {
      // 1. VALIDATE filters (only if provided)
      const filters = {};
      if (opts.from)     filters.from     = validateDate(opts.from);
      if (opts.to)       filters.to       = validateDate(opts.to);
      if (opts.category) filters.category = validateCategory(opts.category);
      if (opts.min) {
        const min = Number(opts.min);
        if (!Number.isFinite(min) || min < 0) {
          console.error(`❌ --min must be a non-negative number (got: ${opts.min})`);
          process.exit(1);
        }
        filters.min = min;
      }

      // 2. LOAD
      const expenses = await loadExpenses();

      // 3. FILTER + SORT (from reporting.js — already verified)
      const result = filterAndSort(expenses, filters, opts.sort, opts.order);

      // 4. PRINT
      if (result.length === 0) {
        console.log('ℹ️  No matching expenses.');
        return;
      }

      console.table(result.map(e => ({
        id: shortId(e.id),
        date: e.date,
        amount: formatCurrency(e.amount),
        category: e.category,
        description: e.description,
        payment: e.payment,
      })));

      const total = result.reduce((sum, e) => sum + e.amount, 0);
      console.log(`\n${result.length} expense(s) — total ${formatCurrency(total)}`);
    });
}