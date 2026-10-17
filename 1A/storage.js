import fs from 'fs/promises';
import path from 'path';
import url from 'url';

const currentFile = url.fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const DATA_FILE = path.join(
    currentDirectory,
    'data',
    'expenses.json'
);

export async function loadExpenses(){
    try{
        const data = await fs.readFile(DATA_FILE,'utf-8');
        const expenses = JSON.parse(data);

        if (!Array.isArray(expenses)) {
        throw new Error('Expense data must be a JSON array.');
        }

        return expenses;
    }
    catch(error){
        if (error.code === 'ENOENT') {
        return [];
        }
        throw error;
    } 
}


export async function saveExpenses(expenses) {
  await fs.writeFile(
    DATA_FILE,
    JSON.stringify(expenses, null, 2),
    'utf-8'
  );
}

