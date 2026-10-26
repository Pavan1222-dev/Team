# Expense Tracker CLI

A command-line expense tracker that stores expenses and monthly category budgets in local JSON files. It uses Node.js, Commander, and the built-in filesystem APIs; it does not use a database.

## Requirements and setup

- Node.js 22.12 or newer
- npm

From this project directory, install the dependencies and link the CLI:

```sh
npm install
npm link
```

The executable is named `expense`. Its default data directory is the project's `data` folder, resolved relative to the installed package—not the directory from which the command is run. Set the optional `EXPENSE_TRACKER_DATA_DIR` environment variable to an absolute or relative directory path to use another location. The directory will be created when data is saved.

Run `expense --help`, `expense add --help`, and `expense list --help` for command-specific help.

## Commands

Categories are `Food`, `Travel`, `Shopping`, `Bills`, and `Other`. Amounts must be positive for expenses. Dates use the real calendar date format `YYYY-MM-DD`.

```sh
# Add an expense (date defaults to today; description and payment mode have defaults)
expense add --amount 18.50 --category Food --description "Lunch" --payment Card
expense add -a 42 -c Travel -d 2026-10-17

# List, filter, and sort expenses
expense list
expense list --category Food --min 10 --from 2026-10-01 --to 2026-10-31 --sort amount

# Update any expense field using its ID from the list output
expense update <id> --amount 21 --date 2026-10-18 --payment Cash
expense update <id> --category Shopping --description "New description"

# Delete an expense
expense delete <id>

# View category and month totals and the highest single expense
expense summary

# Set, list, and remove monthly category budgets
expense budget set Food 300
expense budget list
expense budget delete Food

# Export all expenses or a filtered/sorted subset
expense export --output reports/october.csv
expense export --category Food --from 2026-10-01 --to 2026-10-31 --sort date --output food.csv
```

When an added expense makes its category's total for that calendar month exceed the configured budget, the CLI prints a warning. Budgets are monthly and category-specific.

## Data files

- `data/expenses.json` contains expense records.
- `data/budgets.json` contains category-to-monthly-amount settings.
- Both files are local runtime data and are excluded from Git. The tracker
  initializes correctly if either file is missing.

Invalid or corrupted JSON is reported with a non-zero exit code; the application does not silently replace corrupted data. Expense records have `id`, `date`, `amount`, `category`, `description`, and `paymentMode` properties.

## Design decisions

- Commander validates command options and supported categories at the CLI boundary.
- JSON files keep local usage simple and avoid a database dependency; writes are
  kept separate from reporting and validation logic.
- The data directory can be overridden so installed users need not write into the
  package directory.
- Invalid or corrupted persisted JSON is surfaced rather than silently overwritten.
