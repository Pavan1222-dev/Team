
const fs = require("node:fs/promises");
const path = require("node:path");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "expenses.json");

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(DATA_FILE);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    await fs.writeFile(
      DATA_FILE,
      JSON.stringify(
        { expenses: [], budgets: {} },
        null,
        2
      ),
      "utf8"
    );
  }
}

async function loadData() {
  await ensureDataFile();

  const content = await fs.readFile(DATA_FILE, "utf8");

  let data;

  try {
    data = JSON.parse(content);
  } catch {
    throw new Error("expenses.json contains invalid JSON.");
  }

  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    !Array.isArray(data.expenses)
  ) {
    throw new Error("Invalid data format: expected an expenses array.");
  }

  // Support files created before budgets were introduced.
  if (data.budgets === undefined) {
    data.budgets = {};
  }

  if (
    !data.budgets ||
    typeof data.budgets !== "object" ||
    Array.isArray(data.budgets)
  ) {
    throw new Error("Invalid data format: budgets must be an object.");
  }

  return data;
}

async function saveData(data) {
  await fs.mkdir(DATA_DIR, { recursive: true });

  const tempFile = path.join(DATA_DIR, "expenses.tmp.json");

  await fs.writeFile(
    tempFile,
    JSON.stringify(data, null, 2),
    "utf8"
  );

  await fs.rename(tempFile, DATA_FILE);
}

async function loadexpenses() {
  const data = await loadData();
  return data.expenses;
}

async function saveExpenses(expenses) {
  if (!Array.isArray(expenses)) {
    throw new Error("Expenses must be an array.");
  }

  const data = await loadData();
  data.expenses = expenses;

  await saveData(data);
}

module.exports = {
  DATA_DIR,
  DATA_FILE,
  ensureDataFile,
  loadData,
  saveData,
  loadexpenses,
  saveExpenses
};
