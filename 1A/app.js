
import { Command } from 'commander';
import { addExpense } from './commands/add.js';
import { listExpenses } from './commands/list.js';
import { updateExpense } from './commands/update.js';
import { deleteExpense } from './commands/delete.js';
import { showSummary } from './commands/summary.js';
import { exportExpenses } from './commands/export.js';
import { setBudget } from './commands/budget.js';

const program = new Command();

program
  .name('expense-tracker')
  .description('CLI tool to manage expenses')
  .version('1.0.0');

//add
program
  .command('add')
  .description('Add a new expense')
  .requiredOption('--date <date>', 'Expense date (YYYY-MM-DD)')
  .requiredOption('--amount <amount>', 'Expense amount')
  .requiredOption('--category <category>', 'Expense category')
  .requiredOption('--description <description>', 'Expense description')
  .requiredOption('--payment-mode <mode>', 'Payment mode')
  .action(async (options) => {
    await addExpense(options);
  });

//list
program
  .command('list')
  .description('List expenses with optional filters')
  .option('--from <date>', 'Start date (YYYY-MM-DD)')
  .option('--to <date>', 'End date (YYYY-MM-DD)')
  .option('--category <category>', 'Filter by category')
  .option('--min-amount <amount>', 'Minimum expense amount')
  .option('--sort <field>', 'Sort by date or amount')
  .action(async (options) => {
    await listExpenses(options);
  });

//update
program.command('update')
    .description('Update an existing expense')
    .argument('<id>', 'ID of the expense to update')
    .option('--date <date>', 'New expense date (YYYY-MM-DD)')
    .option('--amount <amount>', 'New expense amount')
    .option('--category <category>', 'New expense category')
    .option('--description <description>', 'New expense description')
    .option('--payment-mode <mode>', 'New payment mode')
    .action(async (id, options) => {
        await updateExpense(id, options);
    });

//delete
program.command('delete')
    .description('Delete an existing expense')
    .argument('<id>', 'ID of the expense to delete')
    .action(async (id) => {
        await deleteExpense(id);
    });

//summary
program.command('summary')
    .description('Show expense totals by category and month')
    .action(async () => {
        await showSummary();
    });

//export
program.command('export')
    .description('Export expenses to a CSV file')
    .option('--from <date>', 'Start date (YYYY-MM-DD)')
    .option('--to <date>', 'End date (YYYY-MM-DD)')
    .option('--category <category>', 'Filter by category')
    .option('--min-amount <amount>', 'Minimum expense amount')
    .option('-o, --output <file>', 'Output CSV filename')
    .action(async (options) => {
        await exportExpenses(options);
    });

//get Budgets
program.command('budget')
    .description('Set a monthly budget for a category')
    .argument('<category>', 'Expense category')
    .argument('<amount>', 'Monthly budget amount')
    .action(async (category, amount) => {
        await setBudget(category, amount);
    });


try { 
  await program.parseAsync(process.argv);
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
}
