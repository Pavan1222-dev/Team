
const fs = require("node:fs");
const path = require("node:path");
const { once } = require("node:events");

function filterExpenses(expenses, options = {}) {
  let result = [...expenses];

  if (options.from) {
    result = result.filter(
      (expense) => expense.date >= options.from
    );
  }

  if (options.to) {
    result = result.filter(
      (expense) => expense.date <= options.to
    );
  }

  if (options.category) {
    result = result.filter(
      (expense) => expense.category === options.category
    );
  }

  if (options.minAmount !== undefined) {
    result = result.filter(
      (expense) => expense.amount >= options.minAmount
    );
  }

  if (options.sort === "date") {
    result.sort((a, b) => a.date.localeCompare(b.date));
  } else if (options.sort === "amount") {
    result.sort((a, b) => a.amount - b.amount);
  }

  return result;
}


function createSummary(expenses) {
  const byCategory = {};
  const byMonth = {};

  let total = 0;
  let highest = null;

  for (const expense of expenses) {
    total += expense.amount;

    byCategory[expense.category] =
      (byCategory[expense.category] || 0) + expense.amount;

    const month = expense.date.slice(0, 7);

    byMonth[month] =
      (byMonth[month] || 0) + expense.amount;

    if (!highest || expense.amount > highest.amount) {
      highest = expense;
    }
  }

  // Round displayed totals to two decimal places.
  for (const category of Object.keys(byCategory)) {
    byCategory[category] = Number(byCategory[category].toFixed(2));
  }

  for (const month of Object.keys(byMonth)) {
    byMonth[month] = Number(byMonth[month].toFixed(2));
  }

  return {
    total: Number(total.toFixed(2)),
    byCategory,
    byMonth,
    highest
  };
}

function csvEscape(value) {
  let text = String(value ?? "");

  // Prevent spreadsheet formulas from running when CSV is opened.
  if (/^[\s]*[=+\-@]/.test(text)) {
    text = "'" + text;
  }

  // Escape double quotes and wrap the value in quotes.
  return `"${text.replace(/"/g, '""')}"`;
}

async function exportToCsv(expenses, outputPath) {
  const absolutePath = path.resolve(outputPath);

  await fs.promises.mkdir(path.dirname(absolutePath), {
    recursive: true
  });

  const stream = fs.createWriteStream(absolutePath, {
    encoding: "utf8"
  });

  const finished = once(stream, "finish");

  // Observe stream errors and prevent an unhandled rejection.
  const failed = once(stream, "error");
  failed.catch(() => {});

  async function writeChunk(chunk) {
    if (!stream.write(chunk)) {
      await Promise.race([
        once(stream, "drain"),
        failed
      ]);
    }
  }

  try {
    await writeChunk(
      "id,date,amount,category,description,paymentMode\n"
    );

    for (const expense of expenses) {
      const row = [
        expense.id,
        expense.date,
        expense.amount.toFixed(2),
        expense.category,
        expense.description,
        expense.paymentMode
      ];

      await writeChunk(
        row.map(csvEscape).join(",") + "\n"
      );
    }

    stream.end();

    await Promise.race([finished, failed]);

    return absolutePath;
  } catch (error) {
    stream.destroy();
    finished.catch(() => {});

    throw new Error(`CSV export failed: ${error.message}`);
  }
}


module.exports = {
  filterExpenses,createSummary,exportToCsv
};
