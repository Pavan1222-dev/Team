import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { ALLOWED_CATEGORIES, validateDate } from './validation.js';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultDataDirectory = path.resolve(moduleDirectory, '..', 'data');

function getDataPath(fileName) {
  const dataDirectory = process.env.EXPENSE_TRACKER_DATA_DIR
    ? path.resolve(process.env.EXPENSE_TRACKER_DATA_DIR)
    : defaultDataDirectory;
  return path.join(dataDirectory, fileName);
}

function validateExpenses(expenses) {
  if (!Array.isArray(expenses)) {
    throw new Error('Expense data must be a JSON array. Correct or restore the data file before continuing.');
  }

  for (const [index, expense] of expenses.entries()) {
    const row = index + 1;
    if (!expense || typeof expense !== 'object' || Array.isArray(expense)) {
      throw new Error(`Expense record ${row} is invalid.`);
    }
    if (typeof expense.id !== 'string' || expense.id.length === 0) {
      throw new Error(`Expense record ${row} has an invalid id.`);
    }
    if (typeof expense.amount !== 'number' || !Number.isFinite(expense.amount) || expense.amount <= 0) {
      throw new Error(`Expense record ${row} has an invalid amount.`);
    }
    if (!ALLOWED_CATEGORIES.includes(expense.category)) {
      throw new Error(`Expense record ${row} has an unknown category.`);
    }
    try {
      validateDate(expense.date, `Date in expense record ${row}`);
    } catch (error) {
      throw new Error(error.message);
    }
    if (typeof expense.description !== 'string' || typeof expense.paymentMode !== 'string') {
      throw new Error(`Expense record ${row} is missing a valid description or payment mode.`);
    }
  }
  return expenses;
}

function validateBudgets(budgets) {
  if (!budgets || typeof budgets !== 'object' || Array.isArray(budgets)) {
    throw new Error('Budget data must be a JSON object. Correct or restore the budget file before continuing.');
  }

  for (const [category, amount] of Object.entries(budgets)) {
    if (!ALLOWED_CATEGORIES.includes(category) || typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
      throw new Error(`Budget entry for "${category}" is invalid.`);
    }
  }
  return budgets;
}

async function readJson(filePath, missingValue, validate, label) {
  let contents;
  try {
    contents = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return missingValue;
    throw new Error(`Cannot read ${label} at ${filePath}: ${error.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new Error(`${label} at ${filePath} contains invalid JSON. Correct or restore the file before continuing.`);
  }
  return validate(parsed);
}

async function writeJson(filePath, value, label, validate) {
  validate(value);
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
    await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    throw new Error(`Cannot save ${label} at ${filePath}: ${error.message}`);
  }
}

export function getExpenses() {
  return readJson(getDataPath('expenses.json'), [], validateExpenses, 'expense data');
}

export function saveExpenses(expenses) {
  return writeJson(getDataPath('expenses.json'), expenses, 'expense data', validateExpenses);
}

export function getBudgets() {
  return readJson(getDataPath('budgets.json'), {}, validateBudgets, 'budget data');
}

export function saveBudgets(budgets) {
  return writeJson(getDataPath('budgets.json'), budgets, 'budget data', validateBudgets);
}
