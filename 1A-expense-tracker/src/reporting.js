
const fs = require("fs/promises");
const path = require('path');


function filterAndSortExpenses(expenses, options) {
  let result = expenses;

  if (options.category) {
    result = result.filter(function(expense) {
      return expense.category === options.category;
    });
  }

  if (options.from) {
    result = result.filter(function(expense) {
      return expense.date >= options.from;
    });
  }


  if (options.to) {
    result = result.filter(function(expense) {
      return expense.date <= options.to;
    });
  }


  if (options.minAmount) {
    result = result.filter(function(expense) {
      return expense.amount >= Number(options.minAmount);
    });
  }

  if (options.sortBy === 'amount') {
    result.sort(function(a, b) {
      return b.amount - a.amount; // Highest amount first
    });
  } else if (options.sortBy === 'date') {
    result.sort(function(a, b) {
      if (a.date > b.date) return 1;
      if (a.date < b.date) return -1;
      return 0;
    });
  }

  return result;
}


function generateSummary(expenses) {
  if (expenses.length === 0) {
    console.log('No expenses found to summarize.');
    return;
  }

  let totalsByCategory = {};
  let totalsByMonth = {};
  let highestExpense = expenses[0]; 

  for (let i = 0; i < expenses.length; i++) {
    let currentExpense = expenses[i];
    let cat = currentExpense.category;
    

    let month = currentExpense.date.substring(0, 7);


    if (totalsByCategory[cat] === undefined) {
      totalsByCategory[cat] = 0;
    }
    totalsByCategory[cat] = totalsByCategory[cat] + currentExpense.amount;


    if (totalsByMonth[month] === undefined) {
      totalsByMonth[month] = 0;
    }
    totalsByMonth[month] = totalsByMonth[month] + currentExpense.amount;


    if (currentExpense.amount > highestExpense.amount) {
      highestExpense = currentExpense;
    }
  }

  console.log('\n--- Totals By Category ---');
  console.table(totalsByCategory);

  console.log('\n--- Totals By Month ---');
  console.table(totalsByMonth);

  console.log('\n--- Highest Single Expense ---');
  console.log(`Amount: Rs ${highestExpense.amount}`);
  console.log(`Date: ${highestExpense.date}`);
  console.log(`Category: ${highestExpense.category}`);
  console.log(`Description: ${highestExpense.description}`);
}


async function exportToCsv(expenses, fileName) {
  let csvText = "id,date,amount,category,description,paymentMode\n";

  for (let i = 0; i < expenses.length; i++) {
    let e = expenses[i];
    csvText = csvText + `${e.id},${e.date},${e.amount},${e.category},${e.description},${e.paymentMode}\n`;
  }

  const savePath = path.join(process.cwd(), fileName);
  

  await fs.writeFile(savePath, csvText, 'utf-8');
  console.log(`Exported ${expenses.length} records to ${savePath}`);
}

module.exports = {
  filterAndSortExpenses,
  generateSummary,
  exportToCsv
};