# expense-tracker

A command-line expense tracker that stores data locally as JSON.

## Install

```bash
git clone <your-repo-url>
cd expense-tracker
npm install
npm link
```

The last step installs `expense` globally — you can run it from any folder.

## Commands

### `add` — record an expense

```bash
expense add --amount 250 --category food --description "Lunch" --payment card
expense add --amount 45 --category transport --description "Auto" --date 2025-01-08
```

Options:
- `--amount <number>` *(required)*
- `--category <name>` *(required)* — one of: food, transport, utilities, entertainment, other
- `--description <text>` *(required)*
- `--date <YYYY-MM-DD>` — defaults to today
- `--payment <mode>` — one of: cash, card, upi, netbanking (default: cash)

### `list` — show expenses with filters

```bash
expense list
expense list --category food --from 2025-01-01 --to 2025-01-31
expense list --min 100 --sort amount --order desc
```

Options:
- `--from <YYYY-MM-DD>` — start date (inclusive)
- `--to <YYYY-MM-DD>` — end date (inclusive)
- `--category <name>` — filter by category
- `--min <number>` — minimum amount
- `--sort <date|amount>` — sort field (default: date)
- `--order <asc|desc>` — sort order (default: desc)

### `summary` — totals by category and month

```bash
expense summary
expense summary --month 2025-01
```

### `update` — modify an expense

```bash
expense update <id> --amount 300
expense update <id> --description "New description" --payment upi
```

Only the fields you pass are changed. `<id>` can be the full UUID or any unique prefix.

### `delete` — remove an expense

```bash
expense delete <id>
```

### `export` — write filtered expenses to CSV

```bash
expense export
expense export --out jan.csv --from 2025-01-01 --to 2025-01-31
```

Options: same filters as `list`, plus:
- `--out <path>` — output file (default: `expenses-YYYY-MM-DD.csv`)

### `budget` — set and check monthly limits

```bash
expense budget set food 5000
expense budget list
expense budget clear transport
```

When you `add` or `update` an expense and the current month's category total exceeds its budget, a warning is printed.

## Data Storage

All data is stored as JSON in the `data/` folder next to the installed package:

- `data/expenses.json` — array of expense records
- `data/budgets.json` — object of `{ category: monthlyLimit }`

Both files are created automatically on first write. If a file is corrupted, it's renamed to `<file>.corrupt-<timestamp>` and a fresh one is started.

## Exit Codes

- `0` — success
- `1` — validation error, missing argument, or not-found