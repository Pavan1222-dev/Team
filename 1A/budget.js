
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const BUDGET_FILE = path.join(
    currentDirectory,
    'data',
    'budgets.json'
);

export async function loadBudgets() {
    try {
        const data = await fs.readFile(BUDGET_FILE, 'utf-8');
        const budgets = JSON.parse(data);

        if (typeof budgets !== 'object' || budgets === null ||Array.isArray(budgets)) {
            throw new Error('Budget data must be a JSON object.');
        }
        return budgets;
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            return {};
        }

        throw error;
    }
}

export async function saveBudgets(budgets) {
    await fs.writeFile(
        BUDGET_FILE,
        JSON.stringify(budgets, null, 2),
        'utf-8'
    );
}
