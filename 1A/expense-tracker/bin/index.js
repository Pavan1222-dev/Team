#!/usr/bin/env node
import { Command } from 'commander';
import { registerAdd } from '../src/commands/add.js';
import { registerList } from '../src/commands/list.js';
import { registerSummary } from '../src/commands/summary.js';
import { registerDelete } from '../src/commands/delete.js';
import { registerUpdate } from '../src/commands/update.js';
import { registerExport } from '../src/commands/export.js';
import { registerBudget } from '../src/commands/budget.js';

const program = new Command();
program.name('expense').description('Expense tracker CLI').version('1.0.0');

registerAdd(program);
registerList(program);
registerSummary(program);
registerDelete(program);
registerUpdate(program);
registerExport(program);
registerBudget(program);

program.parseAsync();