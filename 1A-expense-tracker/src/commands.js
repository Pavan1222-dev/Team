const storage = require('./storage');
const validation = require('./validation');
const reporting = require('./reporting');

async function addExpense(options) {
  let amount = validation.validateAmount(options.amount);
  let date = validation.validateDate(options.date);
  let category = validation.validateCategory(options.category);
  let paymentMode = validation.validatePaymentMode(options.paymentMode);
  let description = options.description;

 
  let data = await storage.loadData();

  
  let nextId = 1;
  for (let i = 0; i < data.expenses.length; i++) {
    if (data.expenses[i].id >= nextId) {
      nextId = data.expenses[i].id + 1;
    }
  }


  let newExpense = {
    id: nextId,
    date: date,
    amount: amount,
    category: category,
    description: description,
    paymentMode: paymentMode
  };


  data.expenses.push(newExpense);
  await storage.saveData(data);
  console.log(`Expense added successfully with ID: ${nextId}`);


  let budgetLimit = data.budgets[category];
  
  if (budgetLimit !== undefined) {
  
    let currentMonth = date.substring(0, 7);
    let monthTotal = 0;
    
    for (let i = 0; i < data.expenses.length; i++) {
      let e = data.expenses[i];
      if (e.category === category && e.date.substring(0, 7) === currentMonth) {
        monthTotal = monthTotal + e.amount;
      }
    }

    if (monthTotal > budgetLimit) {
      console.log(`\n WARNING: You have crossed your monthly budget for ${category}!`);
      console.log(`Budget: Rs ${budgetLimit} | Total spent this month: Rs ${monthTotal}`);
    }
  }
}

async function listExpenses(options) {
  let data = await storage.loadData();
  let filteredList = reporting.filterAndSortExpenses(data.expenses, options);
  
  if (filteredList.length === 0) {
    console.log("No expenses found.");
  } else {
    console.table(filteredList);
  }
}

async function updateExpense(idString, options) {
  let id = Number(idString);
  let data = await storage.loadData();
  

  let foundIndex = -1;
  for (let i = 0; i < data.expenses.length; i++) {
    if (data.expenses[i].id === id) {
      foundIndex = i;
    }
  }

  if (foundIndex === -1) {
    validation.exitWithError(`Could not find expense with ID ${id}`);
  }

  if (options.amount) {
    data.expenses[foundIndex].amount = validation.validateAmount(options.amount);
  }
  if (options.date) {
    data.expenses[foundIndex].date = validation.validateDate(options.date);
  }
  if (options.category) {
    data.expenses[foundIndex].category = validation.validateCategory(options.category);
  }
  if (options.paymentMode) {
    data.expenses[foundIndex].paymentMode = validation.validatePaymentMode(options.paymentMode);
  }
  if (options.description) {
    data.expenses[foundIndex].description = options.description;
  }

  await storage.saveData(data);
  console.log(`Expense ${id} updated successfully.`);
}

async function deleteExpense(idString) {
  let id = Number(idString);
  let data = await storage.loadData();

  let newExpensesArray = data.expenses.filter(
    expense => expense.id !== id
  );

  if (newExpensesArray.length === data.expenses.length) {
    validation.exitWithError(`Could not find expense with ID ${id}`);
  }

  data.expenses = newExpensesArray;

  await storage.saveData(data);
  console.log(`Expense ${id} deleted successfully.`);
}

async function summaryCommand() {
  let data = await storage.loadData();
  reporting.generateSummary(data.expenses);
}

async function exportCommand(options) {
  let data = await storage.loadData();
  let filteredList = reporting.filterAndSortExpenses(data.expenses, options);
  
  await reporting.exportToCsv(filteredList, 'expenses.csv');
}

async function setBudget(options) {
  let category = validation.validateCategory(options.category);
  let amount = validation.validateAmount(options.amount);
  
  let data = await storage.loadData();
  data.budgets[category] = amount;
  
  await storage.saveData(data);
  console.log(`Monthly budget for ${category} successfully set to Rs ${amount}`);
}

module.exports = {
  addExpense,
  listExpenses,
  updateExpense,
  deleteExpense,
  summaryCommand,
  exportCommand,
  setBudget
};