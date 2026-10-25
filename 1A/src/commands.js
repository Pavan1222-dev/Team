const {
  loadData,
  saveData,
  loadexpenses,
  saveExpenses
} = require("./storage");

const {
  createSummary,
  exportToCsv
} = require("./reporting");
const {
  validateDateRange,
  validateCategory,
  validateMinimumAmount
} = require("./validation");

const { filterExpenses } = require("./reporting");
//const { loadexpenses, saveExpenses } = require("./storage");

function getToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function registerCommands(program) {
  // ADD COMMAND
  program
    .command("add")
    .description("Add a new expense")
    .requiredOption("--amount <amount>", "Expense amount")
    .requiredOption("--category <category>", "Expense category")
    .requiredOption("--description <description>", "Expense description")
    .requiredOption("--payment <mode>", "Payment mode")
    .option("--date <date>", "Expense date (YYYY-MM-DD)", getToday())
    .action(async (options) => {
      const amount = Number(options.amount);

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Amount must be a positive number.");
      }

      if (!Number.isSafeInteger(amount * 100)) {
        throw new Error("Amount cannot have more than two decimal places.");
      }

      const date = options.date;

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ||
        new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date
      ) {
        throw new Error("Date must be a valid date in YYYY-MM-DD format.");
      }

      const category = options.category.trim().toLowerCase();

      const allowedCategories = [
        "food",
        "travel",
        "shopping",
        "bills",
        "health",
        "education",
        "entertainment",
        "utilities",
        "salary",
        "other"
      ];

      if (!allowedCategories.includes(category)) {
        throw new Error(`Unknown category: ${options.category}`);
      }

      const paymentMode = options.payment.trim().toLowerCase();

      const allowedPaymentModes = [
        "cash",
        "upi",
        "card",
        "bank-transfer",
        "other"
      ];

      if (!allowedPaymentModes.includes(paymentMode)) {
        throw new Error(`Unknown payment mode: ${options.payment}`);
      }

      const description = options.description.trim();

      if (!description) {
        throw new Error("Description cannot be empty.");
      }

      const expenses = await loadexpenses();

      const nextId =
        expenses.length === 0
          ? 1
          : Math.max(...expenses.map((expense) => expense.id)) + 1;

      const expense = {
        id: nextId,
        date,
        amount: Math.round(amount * 100) / 100,
        category,
        description,
        paymentMode
      };

      
expenses.push(expense);

await saveExpenses(expenses);

console.log("Expense added successfully!");
console.table([expense]);

// Check the monthly budget for this category.
const data = await loadData();

const month = expense.date.slice(0, 7);
const budget = data.budgets[expense.category];

if (budget !== undefined) {
  const monthlySpent = data.expenses
    .filter(
      (item) =>
        item.category === expense.category &&
        item.date.slice(0, 7) === month
    )
    .reduce((sum, item) => sum + item.amount, 0);

  if (monthlySpent > budget) {
    console.warn(
      `WARNING: ${expense.category} budget exceeded for ${month}. ` +
      `Spent: ${monthlySpent.toFixed(2)}, ` +
      `budget: ${budget.toFixed(2)}.`
    );
  }
}

    });

  // LIST COMMAND
  
  // LIST COMMAND WITH FILTERS AND SORTING
  program
    .command("list")
    .description("List expenses with filters and sorting")
    .option("--from <date>", "Start date (YYYY-MM-DD)")
    .option("--to <date>", "End date (YYYY-MM-DD)")
    .option("--category <category>", "Filter by category")
    .option("--min-amount <amount>", "Minimum expense amount")
    .option("--sort <field>", "Sort by date or amount")
    .action(async (options) => {
      const dates = validateDateRange(options.from, options.to);

      const category = options.category
        ? validateCategory(options.category)
        : undefined;

      const minAmount = options.minAmount !== undefined
        ? validateMinimumAmount(options.minAmount)
        : undefined;

      if (
        options.sort !== undefined &&
        !["date", "amount"].includes(options.sort)
      ) {
        throw new Error("Sort must be either date or amount.");
      }

      const expenses = await loadexpenses();

      const filteredExpenses = filterExpenses(expenses, {
        from: dates.from,
        to: dates.to,
        category,
        minAmount,
        sort: options.sort
      });

      if (filteredExpenses.length === 0) {
        console.log("No expenses found matching your filters.");
        return;
      }

      console.table(filteredExpenses);
    });

    
  // UPDATE COMMAND
  program
    .command("update <id>")
    .description("Update an existing expense")
    .option("--amount <amount>", "New expense amount")
    .option("--category <category>", "New expense category")
    .option("--description <description>", "New description")
    .option("--payment <mode>", "New payment mode")
    .option("--date <date>", "New expense date (YYYY-MM-DD)")
    .action(async (rawId, options) => {
      const id = Number(rawId);

      if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error("Expense ID must be a positive integer.");
      }

      const hasUpdate = [
        options.amount,
        options.category,
        options.description,
        options.payment,
        options.date
      ].some((value) => value !== undefined);

      if (!hasUpdate) {
        throw new Error("Provide at least one field to update.");
      }

      const expenses = await loadexpenses();

      const expense = expenses.find((item) => item.id === id);

      if (!expense) {
        throw new Error(`Expense with ID ${id} was not found.`);
      }

      // Validate and update the amount.
      if (options.amount !== undefined) {
        const amount = Number(options.amount);

        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error("Amount must be a positive number.");
        }

        if (!Number.isSafeInteger(amount * 100)) {
          throw new Error("Amount cannot have more than two decimal places.");
        }

        expense.amount = Math.round(amount * 100) / 100;
      }

      // Validate and update the category.
      if (options.category !== undefined) {
        const category = options.category.trim().toLowerCase();

        const allowedCategories = [
          "food",
          "travel",
          "shopping",
          "bills",
          "health",
          "education",
          "entertainment",
          "utilities",
          "salary",
          "other"
        ];

        if (!allowedCategories.includes(category)) {
          throw new Error(`Unknown category: ${options.category}`);
        }

        expense.category = category;
      }

      // Validate and update the description.
      if (options.description !== undefined) {
        const description = options.description.trim();

        if (!description) {
          throw new Error("Description cannot be empty.");
        }

        expense.description = description;
      }

      // Validate and update the payment mode.
      if (options.payment !== undefined) {
        const paymentMode = options.payment.trim().toLowerCase();

        const allowedPaymentModes = [
          "cash",
          "upi",
          "card",
          "bank-transfer",
          "other"
        ];

        if (!allowedPaymentModes.includes(paymentMode)) {
          throw new Error(`Unknown payment mode: ${options.payment}`);
        }

        expense.paymentMode = paymentMode;
      }

      // Validate and update the date.
      if (options.date !== undefined) {
        const date = options.date;

        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ||
          new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date
        ) {
          throw new Error("Date must be a valid date in YYYY-MM-DD format.");
        }

        expense.date = date;
      }

      await saveExpenses(expenses);

      console.log(`Expense #${id} updated successfully.`);
      console.table([expense]);
    });
   
  // DELETE COMMAND
  program
    .command("delete <id>")
    .description("Delete an expense by ID")
    .action(async (rawId) => {
      const id = Number(rawId);

      if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error("Expense ID must be a positive integer.");
      }

      const expenses = await loadexpenses();

      const index = expenses.findIndex(
        (item) => item.id === id
      );

      if (index === -1) {
        throw new Error(`Expense with ID ${id} was not found.`);
      }

      const deletedExpense = expenses[index];

      expenses.splice(index, 1);

      await saveExpenses(expenses);

      console.log(`Expense #${id} deleted successfully.`);
      console.table([deletedExpense]);
    });

    
  // SUMMARY COMMAND
  program
    .command("summary")
    .description("Show expense totals by category and month")
    .action(async () => {
      const expenses = await loadexpenses();
      const summary = createSummary(expenses);

      console.log("\nExpense Summary");
      console.log("---------------------------");
      console.log(`Total expenses: ${summary.total.toFixed(2)}`);

      console.log("\nTotal by category:");

      for (const [category, amount] of Object.entries(summary.byCategory)) {
        console.log(`  ${category}: ${amount.toFixed(2)}`);
      }

      console.log("\nTotal by month:");

      for (const [month, amount] of Object.entries(summary.byMonth)) {
        console.log(`  ${month}: ${amount.toFixed(2)}`);
      }

      console.log("\nHighest single expense:");

      if (summary.highest) {
        console.log(
          `  #${summary.highest.id} - ${summary.highest.description}: ` +
          `${summary.highest.amount.toFixed(2)}`
        );
      } else {
        console.log("  No expenses recorded.");
      }
    });
    
  // EXPORT COMMAND
  program
    .command("export")
    .description("Export filtered expenses to a CSV file")
    .requiredOption("--output <file>", "CSV output file path")
    .option("--from <date>", "Start date (YYYY-MM-DD)")
    .option("--to <date>", "End date (YYYY-MM-DD)")
    .option("--category <category>", "Filter by category")
    .option("--min-amount <amount>", "Minimum expense amount")
    .option("--sort <field>", "Sort by date or amount")
    .action(async (options) => {
      const dates = validateDateRange(options.from, options.to);

      const category = options.category
        ? validateCategory(options.category)
        : undefined;

      const minAmount = options.minAmount !== undefined
        ? validateMinimumAmount(options.minAmount)
        : undefined;

      if (
        options.sort !== undefined &&
        !["date", "amount"].includes(options.sort)
      ) {
        throw new Error("Sort must be either date or amount.");
      }

      const expenses = await loadexpenses();

      const filteredExpenses = filterExpenses(expenses, {
        from: dates.from,
        to: dates.to,
        category,
        minAmount,
        sort: options.sort
      });

      const output = await exportToCsv(
        filteredExpenses,
        options.output
      );

      console.log(
        `Exported ${filteredExpenses.length} expense(s) to ${output}`
      );
    });

    
  // BUDGET COMMAND
  program
    .command("budget <category> <amount>")
    .description("Set a monthly budget for an expense category")
    .action(async (rawCategory, rawAmount) => {
      const category = validateCategory(rawCategory);
      const amount = Number(rawAmount);

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Budget must be a positive number.");
      }

      if (Math.round(amount * 100) / 100 !== amount) {
        throw new Error("Budget cannot have more than two decimal places.");
      }

      const data = await loadData();

      data.budgets[category] = amount;

      await saveData(data);

      console.log(
        `Monthly budget for ${category} set to ${amount.toFixed(2)}.`
      );
    });


}

module.exports = {
  registerCommands
};
