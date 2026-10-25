# Expense Tracker CLI

A command-line application built with Node.js to manage personal expenses without a database.

## Features

- Add, list, update, and delete expenses
- Filter expenses by date, category, and minimum amount
- Sort expenses by date or amount
- View total spending, category totals, monthly totals, and highest expense
- Export expenses to CSV
- Set monthly budgets by category
- Receive warnings when a category budget is exceeded
- Validate user input and handle data-file errors

## Technologies Used

- Node.js
- JavaScript
- Commander.js
- File System (`fs/promises`)
- Path module
- JSON for data storage
- CSV for exporting reports

## Installation

Install Node.js, download or clone this project, and open its folder in a terminal.

```bash
npm install
```

## Usage

Add an expense:

```bash
expense add --amount 250 --category food --description Lunch --payment upi
```

List expenses:

```bash
expense list
```

Filter expenses:

```bash
expense list --category food
expense list --min-amount 300
expense list --from 2026-10-01 --to 2026-10-31
expense list --sort amount
```

Update or delete an expense:

```bash
expense update 1 --amount 300
expense delete 1
```

View a summary:

```bash
expense summary
```

Set a monthly category budget:

```bash
expense budget food 3000
```

Export expenses:

```bash
expense export --output expenses.csv
```

View available commands and options:

```bash
expense --help
expense add --help
expense list --help
```

## Data Storage

Expenses and budgets are stored in a JSON file. No database is required.

## Project Structure

- `src/index.js` — CLI entry point
- `src/commands.js` — command definitions
- `src/storage.js` — JSON file operations
- `src/validation.js` — input validation
- `src/reporting.js` — filters, summaries, and CSV export
- `data/expenses.json` — expense and budget data

## License

ISC
