import crypto from 'crypto';
import { loadExpenses, saveExpenses } from '../storage.js';
import {
  validateAmount, validateDate, validateCategory, validatePaymentMode,
} from '../validation.js';
import { checkBudget } from '../budget.js';
import { formatCurrency, today } from '../utils.js';

export function registerAdd(program) {
  program
    .command('add')
    .description('Add a new expense')
    .requiredOption('--amount <number>', 'Amount spent')
    .requiredOption('--category <name>', 'Category')
    .option('--date <YYYY-MM-DD>', 'Date (defaults to today)')
    .requiredOption('--description <text>', 'What you spent on')
    .option('--payment <mode>', 'Payment mode', 'cash')
    .action(async (opts) => {
      // 1. VALIDATE + CONVERT (this.exit(1)s on bad input)
      const amount   = validateAmount(opts.amount);
      const category = validateCategory(opts.category);
      const date     = opts.date ? validateDate(opts.date) : today();
      const payment  = validatePaymentMode(opts.payment);

      // 2. LOAD existing expenses
      const expenses = await loadExpenses();

      // 3. BUILD new expense
      const expense = {
        id: crypto.randomUUID(),
        date,
        amount,
        category,
        description: opts.description,
        payment,
      };
      expenses.push(expense);

      // 4. SAVE
      await saveExpenses(expenses);

      // 5. CONFIRM + budget check
      console.log(`✅ Added ${category} ${formatCurrency(amount)} on ${date}`);
      await checkBudget(expenses, category, date);
    });
}