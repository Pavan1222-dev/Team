#!/usr/bin/env node

const { Command } = require('commander');
const commands = require('../src/commands');

const program = new Command();


program
  .name('expense')
  .description('A simple CLI tool to record and report expenses')
  .version('1.0.0');

//ADD
program
  .command('add')
  .description('Add a new expense')
  .requiredOption('-d, --date <YYYY-MM-DD>', 'Date of the expense')
  .requiredOption('-a, --amount <number>', 'Amount spent')
  .requiredOption('-c, --category <string>', 'Category (Food, Travel, Utilities, Entertainment, Shopping, Other)')
  .requiredOption('--description <string>', 'Description of the expense')
  .requiredOption('-p, --paymentMode <string>', 'Payment Mode (Cash, Card, UPI, Bank Transfer)')
  .action(function(options) {
    commands.addExpense(options);
  });

//list
program
  .command('list')
  .description('List expenses (can be filtered and sorted)')
  .option('-c, --category <string>', 'Filter by category')
  .option('--from <YYYY-MM-DD>', 'Show expenses from this date')
  .option('--to <YYYY-MM-DD>', 'Show expenses up to this date')
  .option('-m, --minAmount <number>', 'Show expenses above this amount')
  .option('-s, --sortBy <string>', 'Sort by "date" or "amount"')
  .action(function(options) {
    commands.listExpenses(options);
  });

//update
program
  .command('update <id>')
  .description('Update an existing expense by its ID')
  .option('-d, --date <YYYY-MM-DD>', 'New date')
  .option('-a, --amount <number>', 'New amount')
  .option('-c, --category <string>', 'New category')
  .option('--description <string>', 'New description')
  .option('-p, --paymentMode <string>', 'New payment mode')
  .action(function(id, options) {
    commands.updateExpense(id, options);
  });

//delete
program
  .command('delete <id>')
  .description('Delete an expense by its ID')
  .action(function(id) {
    commands.deleteExpense(id);
  });

//Summary
program
  .command('summary')
  .description('Show total per category, per month, and highest single expense')
  .action(function() {
    commands.summaryCommand();
  });

//export
program
  .command('export')
  .description('Export the expenses to a CSV file')
  .option('-c, --category <string>', 'Filter by category')
  .option('--from <YYYY-MM-DD>', 'Start date')
  .option('--to <YYYY-MM-DD>', 'End date')
  .option('-m, --minAmount <number>', 'Minimum amount')
  .action(function(options) {
    commands.exportCommand(options);
  });

//budget
program
  .command('budget')
  .description('Set a monthly budget for a category')
  .requiredOption('-c, --category <string>', 'Category name')
  .requiredOption('-a, --amount <number>', 'Budget limit amount')
  .action(function(options) {
    commands.setBudget(options);
  });

program.parse(process.argv);