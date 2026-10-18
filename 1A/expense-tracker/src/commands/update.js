import { loadExpenses, saveExpenses } from '../storage.js';
import {
  validateAmount, validateDate, validateCategory, validatePaymentMode,
} from '../validation.js';
import { checkBudget } from '../budget.js';
import { shortId, formatCurrency } from '../utils.js';

export function registerUpdate(program) {
  program
    .command('update <id>')
    .description('Update fields of an existing expense (only fields you pass are changed)')
    .option('--amount <number>', 'New amount')
    .option('--category <name>', 'New category')
    .option('--date <YYYY-MM-DD>', 'New date')
    .option('--description <text>', 'New description')
    .option('--payment <mode>', 'New payment mode')
    .action(async (idArg, opts) => {
      // 1. VALIDATE any provided fields (fail fast before touching the file)
      const changes = {};
      if (opts.amount      !== undefined) changes.amount      = validateAmount(opts.amount);
      if (opts.category    !== undefined) changes.category    = validateCategory(opts.category);
      if (opts.date        !== undefined) changes.date        = validateDate(opts.date);
      if (opts.description !== undefined) changes.description = opts.description;
      if (opts.payment     !== undefined) changes.payment     = validatePaymentMode(opts.payment);

      if (Object.keys(changes).length === 0) {
        console.error('❌ Nothing to update. Pass at least one of: --amount, --category, --date, --description, --payment');
        process.exit(1);
      }

      // 2. LOAD
      const expenses = await loadExpenses();

      // 3. FIND by full id or short prefix (same as delete)
      const matches = expenses.filter(e => e.id === idArg || e.id.startsWith(idArg));
      if (matches.length === 0) {
        console.error(`❌ No expense found with id "${idArg}"`);
        process.exit(1);
      }
      if (matches.length > 1) {
        console.error(`❌ Id "${idArg}" is ambiguous — matches ${matches.length} expenses. Provide a longer prefix.`);
        process.exit(1);
      }
      const target = matches[0];

      // 4. APPLY changes
      const updated = { ...target, ...changes };

      // 5. SAVE (replace the one entry in the array)
      const next = expenses.map(e => (e.id === target.id ? updated : e));
      await saveExpenses(next);

      // 6. CONFIRM
      console.log(`✏️  Updated ${shortId(target.id)}:`);
      for (const [key, val] of Object.entries(changes)) {
        const before = target[key];
        const after = val;
        const fmtBefore = key === 'amount' ? formatCurrency(before) : before;
        const fmtAfter  = key === 'amount' ? formatCurrency(after)  : after;
        console.log(`   ${key}: ${fmtBefore} → ${fmtAfter}`);
      }

      // 7. Re-check budget if amount or category changed
      if (changes.amount !== undefined || changes.category !== undefined) {
        await checkBudget(next, updated.category, updated.date);
      }
    });
}