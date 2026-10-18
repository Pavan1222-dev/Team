import { writeFile } from 'fs/promises';
import path from 'path';
import { loadExpenses } from '../storage.js';
import { filterAndSort } from '../reporting.js';
import { validateDate, validateCategory } from '../validation.js';
import { csvEscape, today } from '../utils.js';

export function registerExport(program) {
  program
    .command('export')
    .description('Export filtered expenses to a CSV file')
    .option('--out <path>', 'Output file path (default: expenses-YYYY-MM-DD.csv)')
    .option('--from <YYYY-MM-DD>', 'Start date (inclusive)')
    .option('--to <YYYY-MM-DD>', 'End date (inclusive)')
    .option('--category <name>', 'Filter by category')
    .option('--min <number>', 'Minimum amount')
    .option('--sort <field>', 'Sort by "date" or "amount"', 'date')
    .option('--order <dir>', 'Sort order "asc" or "desc"', 'desc')
    .action(async (opts) => {
      // 1. VALIDATE filters (same pattern as list)
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

      // 2. LOAD + FILTER + SORT (reuse reporting.js)
      const expenses = await loadExpenses();
      const result = filterAndSort(expenses, filters, opts.sort, opts.order);

      // 3. WRITE CSV (header always written, even for zero rows)
      const outPath = opts.out || `expenses-${today()}.csv`;
      const resolved = path.resolve(outPath);

      const header = 'id,date,amount,category,description,payment';
      const rows = result.map(e =>
        [e.id, e.date, e.amount, e.category, e.description, e.payment]
          .map(csvEscape)
          .join(',')
      );
      const csv = [header, ...rows].join('\n') + '\n';

      try {
        await writeFile(resolved, csv, 'utf-8');
      } catch (err) {
        console.error(`❌ Could not write file: ${err.message}`);
        process.exit(1);
      }

      // 4. CONFIRM
      console.log(`📄 Exported ${result.length} expense(s) to ${resolved}`);
    });
}