# Expense Tracker CLI

A Node.js command-line application for tracking expenses, managing monthly category budgets, viewing spending summaries, and exporting expenses to CSV.

## Features

- Add, list, update, and delete expenses.
- Filter by date range, category, and minimum amount.
- Sort expenses by date or amount.
- View spending totals by category and month.
- Identify the highest single expense.
- Set monthly budgets and warn when spending exceeds a budget.
- Export filtered expenses to CSV.
- Validate amounts, dates, categories, descriptions, and payment modes.

## Requirements

- Node.js
- npm

## Installation

Clone the repository and navigate to the `1A` directory.

```bash
npm install
```

To make the CLI available globally on your machine:

```bash
npm link
```

## Usage

Run commands with `node app.js`, or use `expense-tracker` after global installation.

### Add an expense

```bash
expense-tracker add --date 2026-10-17 --amount 250 --category Food --description "Lunch" --payment-mode UPI
```

### List expenses

```bash
expense-tracker list
expense-tracker list --category Food
expense-tracker list --from 2026-10-01 --to 2026-10-31
```

### Update or delete an expense

```bash
expense-tracker update EXPENSE_ID --amount 300
expense-tracker delete EXPENSE_ID
```

Replace `EXPENSE_ID` with the ID shown when listing expenses.

### View summary

```bash
expense-tracker summary
```

### Export to CSV

```bash
expense-tracker export --output expenses.csv
```

### Set a monthly budget

```bash
expense-tracker budget Food 500
```

### View help

```bash
expense-tracker --help
expense-tracker add --help
```

## Data storage

- `data/expenses.json` stores expense records.
- `data/budgets.json` stores category budgets.

Missing JSON files are treated as empty datasets. Malformed JSON produces an error rather than silently replacing existing data.

## Project structure

- `app.js` — CLI entry point.
- `commands/` — Individual command handlers.
- `storage.js` — Expense persistence.
- `budget.js` — Budget persistence.
- `validation.js` — Input validation.
- `reporting.js` — Reporting module, if used.

## Design decisions

- Commander handles command-line arguments and options.
- Node.js file-system promises provide asynchronous file operations.
- Commands, validation, and persistence are separated into modules.
- JSON files keep local storage simple and avoid requiring a database.

## Development

```bash
npm run lint
npm test
```

## Notes

Data is stored locally. Back up the `data` directory before manually modifying its contents.