import { readFile, writeFile, rename, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'expenses.json');

export async function loadExpenses() {
  try {
    if (!existsSync(DATA_FILE)) return [];
    const raw = await readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (existsSync(DATA_FILE)) {
      await rename(DATA_FILE, `${DATA_FILE}.corrupt-${Date.now()}`);
    }
    console.error('⚠️  Data file corrupted. Backup created, starting fresh.');
    return [];
  }
}

export async function saveExpenses(expenses) {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(expenses, null, 2));
  await rename(tmp, DATA_FILE);
}

const BUDGET_FILE = path.join(DATA_DIR, 'budgets.json');

export async function loadBudgets() {
  try {
    if (!existsSync(BUDGET_FILE)) return {};
    const raw = await readFile(BUDGET_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (err) {
    if (existsSync(BUDGET_FILE)) {
      await rename(BUDGET_FILE, `${BUDGET_FILE}.corrupt-${Date.now()}`);
    }
    console.error('⚠️  Budget file corrupted. Backup created, starting fresh.');
    return {};
  }
}

export async function saveBudgets(budgets) {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = `${BUDGET_FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(budgets, null, 2));
  await rename(tmp, BUDGET_FILE);
}