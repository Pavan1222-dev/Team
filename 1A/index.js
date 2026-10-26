#!/usr/bin/env node
import { Command, Option } from 'commander';
import { addExpense } from './services/add.js';
import { listExpenses } from './services/list.js';
import { deleteExpense } from './services/delete.js';
import { updateExpense } from './services/update.js';
import { showSummaryAction } from './services/summary.js';
import { exportAction } from './services/export.js';
import { setBudget, listBudgets, deleteBudget } from './services/budget.js';
import { ALLOWED_CATEGORIES } from './modules/validation.js';

const program = new Command();

program
  .name('expense')
  .description('A command-line expense tracker backed by local JSON files')
  .version('1.0.0');

program
  .command('add')
  .description('Add a new expense')
  .requiredOption('-a, --amount <number>', 'Positive expense amount')
  .addOption(new Option('-c, --category <category>', 'Expense category').choices(ALLOWED_CATEGORIES).makeOptionMandatory())
  .option('-d, --date <YYYY-MM-DD>', 'Expense date (defaults to today)')
  .option('-i, --description <text>', 'Expense description', 'No description')
  .option('-p, --payment <mode>', 'Payment mode', 'Cash')
  .action(addExpense);

program
  .command('list')
  .description('List expenses with optional filters')
  .addOption(new Option('-c, --category <category>', 'Filter by category').choices(ALLOWED_CATEGORIES))
  .option('-m, --min <amount>', 'Minimum amount')
  .option('--from <YYYY-MM-DD>', 'Include expenses on or after this date')
  .option('--to <YYYY-MM-DD>', 'Include expenses on or before this date')
  .addOption(new Option('-s, --sort <field>', 'Sort by date or amount').choices(['date', 'amount']).default('date'))
  .action(listExpenses);

program
  .command('update')
  .description('Update one or more fields on an expense')
  .argument('<id>', 'Expense ID')
  .option('-a, --amount <number>', 'New positive amount')
  .addOption(new Option('-c, --category <category>', 'New category').choices(ALLOWED_CATEGORIES))
  .option('-d, --date <YYYY-MM-DD>', 'New date')
  .option('-i, --description <text>', 'New description')
  .option('-p, --payment <mode>', 'New payment mode')
  .action(updateExpense);

program
  .command('delete')
  .description('Delete an expense')
  .argument('<id>', 'Expense ID')
  .action(deleteExpense);

program
  .command('summary')
  .description('Show totals by category and month, plus the highest expense')
  .action(showSummaryAction);

program
  .command('export')
  .description('Export the filtered expense list to CSV')
  .addOption(new Option('-c, --category <category>', 'Filter by category').choices(ALLOWED_CATEGORIES))
  .option('-m, --min <amount>', 'Minimum amount')
  .option('--from <YYYY-MM-DD>', 'Include expenses on or after this date')
  .option('--to <YYYY-MM-DD>', 'Include expenses on or before this date')
  .addOption(new Option('-s, --sort <field>', 'Sort by date or amount').choices(['date', 'amount']).default('date'))
  .option('-o, --output <file>', 'CSV output file', 'export.csv')
  .action(exportAction);

const budget = program.command('budget').description('Manage monthly category budgets');
budget
  .command('set')
  .description('Set or replace a category monthly budget')
  .argument('<category>', `Category (${ALLOWED_CATEGORIES.join(', ')})`)
  .argument('<amount>', 'Non-negative monthly budget amount')
  .action(setBudget);
budget
  .command('list')
  .description('List monthly category budgets')
  .action(listBudgets);
budget
  .command('delete')
  .description('Remove a category monthly budget')
  .argument('<category>', 'Category')
  .action(deleteBudget);

program.parseAsync(process.argv).catch(error => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
