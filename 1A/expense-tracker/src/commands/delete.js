import { loadExpenses, saveExpenses } from '../storage.js';
import { shortId } from '../utils.js';

export function registerDelete(program) {
  program
    .command('delete <id>')
    .description('Delete an expense by its id (full or short prefix)')
    .action(async (idArg) => {
      // 1. LOAD
      const expenses = await loadExpenses();

      // 2. FIND — match by full id OR short prefix
      const matches = expenses.filter(e => e.id === idArg || e.id.startsWith(idArg));

      if (matches.length === 0) {
        console.error(`❌ No expense found with id "${idArg}"`);
        process.exit(1);
      }

      if (matches.length > 1) {
        console.error(`❌ Id "${idArg}" is ambiguous — matches ${matches.length} expenses:`);
        for (const m of matches) {
          console.error(`   ${shortId(m.id)}  ${m.date}  ${m.description}`);
        }
        console.error(`   Provide a longer prefix to disambiguate.`);
        process.exit(1);
      }

      const target = matches[0];

      // 3. REMOVE
      const remaining = expenses.filter(e => e.id !== target.id);

      // 4. SAVE
      await saveExpenses(remaining);

      // 5. CONFIRM
      console.log(`🗑️  Deleted ${shortId(target.id)}: ${target.category} ₹${target.amount} "${target.description}"`);
    });
}