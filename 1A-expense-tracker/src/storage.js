const fs = require('fs/promises');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'expenses.json');

async function loadData() {
  try {
    
    let rawText = await fs.readFile(DATA_FILE, 'utf-8');
    let data = JSON.parse(rawText);
    
    
    if (data.expenses === undefined) {
      console.log('Data file looks corrupted. Starting fresh.');
      return { expenses: [], budgets: {} };
    }
    
    return data;
    
  } catch (error) {
   
    return { expenses: [], budgets: {} };
  }
}

async function saveData(data) {
  
  let textToSave = JSON.stringify(data, null, 2);
  await fs.writeFile(DATA_FILE, textToSave, 'utf-8');
}

module.exports = { loadData, saveData, DATA_FILE };