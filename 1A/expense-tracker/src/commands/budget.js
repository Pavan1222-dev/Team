import { loadBudgets, saveBudgets } from '../storage.js';
import { validateAmount, validateCategory, CATEGORIES } from '../validation.js';
import { loadExpenses } from '../storage.js';
import { getMonth, formatCurrency, today } from '../utils.js';
import { spentInCategoryMonth } from '../budget.js';

export function registerBudget(program) {
  const budget = program
    .command('budget')
    .description('Manage monthly budgets per category');

  // --- budget set <category> <amount> ---
  budget
    .command('set <category> <amount>')
    .description('Set a monthly budget for a category')
    .action(async (category, amount) => {
      const cat = validateCategory(category);
      const amt = validateAmount(amount);

      const budgets = await loadBudgets();
      budgets[cat] = amt;
      await saveBudgets(budgets);

      console.log(`✅ Budget for ${cat} set to ${formatCurrency(amt)}/month`);
    });

  // --- budget list ---
  budget
    .command('list')
    .description('Show all budgets and current-month spending')
    .action(async () => {
      const budgets = await loadBudgets();
      const entries = Object.entries(budgets);

      if (entries.length === 0) {
        console.log('ℹ️  No budgets set. Use `expense budget set <category> <amount>`.');
        return;
      }

      const expenses = await loadExpenses();
      const month = getMonth(today());

      const rows = entries.map(([cat, limit]) => {
        const spent = spentInCategoryMonth(expenses, cat, month);
        const remaining = limit - spent;
        return {
          category: cat,
          budget: formatCurrency(limit),
          spent_this_month: formatCurrency(spent),
          remaining: formatCurrency(remaining),
          status: spent > limit ? '⚠️ OVER' : '✓ ok',
        };
      });

      console.table(rows);
      console.log(`(Current month: ${month})`);
    });

  // --- budget clear <category> ---
  budget
    .command('clear <category>')
    .description('Remove the budget for a category')
    .action(async (category) => {
      const cat = validateCategory(category);
      const budgets = await loadBudgets();

      if (budgets[cat] == null) {
        console.error(`❌ No budget set for ${cat}`);
        process.exit(1);
      }

      delete budgets[cat];
      await saveBudgets(budgets);
      console.log(`🗑️  Cleared budget for ${cat}`);
    });
}