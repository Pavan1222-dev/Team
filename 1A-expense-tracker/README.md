# My Expense Tracker CLI (Project 1A)

Hi! This is a command-line tool I made to track expenses. It saves all the data locally inside a JSON file, so we don't need to set up a database. 

## How to set it up
Before you can use it, you need to download the packages I used (like commander for the terminal menu). Run this in the folder:
`npm install`

Then, to make the computer understand the word "expense", you have to run this command:
`npm link`

## Command Examples

If you forget what to type, you can always just type `expense --help` to see the menu.

**1. Adding an expense**
You have to include the date, amount, category, description, and payment mode. Here is an example of buying groceries:
`expense add -d 2026-10-18 -a 500 -c Food --description "Groceries" -p Cash`

**2. Setting a budget**
If you want to warn yourself when you spend too much on Food:
`expense budget -c Food -a 2000`

**3. Looking at your list**
To see everything:
`expense list`
To only see Food expenses over 100 rupees:
`expense list -c Food -m 100`

**4. Fixing a mistake**
If expense ID 1 was actually 600 rupees instead of 500:
`expense update 1 -a 600`

**5. View the summary**
To see the highest expense and totals by category:
`expense summary`

**6. Exporting to CSV**
To save your list to a file you can open in Excel:
`expense export -o my_expenses.csv`

## Design Decisions
* **Storage:** I used the `fs/promises` module to read and write to a local JSON file. If the file is missing or corrupted, the app catches the error and starts with a clean, empty list instead of crashing.
* **Modularity:** I separated the code into `storage`, `validation`, `reporting`, and `commands` to keep responsibilities clear and make the code easier to read.