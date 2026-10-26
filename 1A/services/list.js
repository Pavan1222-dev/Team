import { getExpenses } from '../modules/storage.js';
import { validateListOptions } from '../modules/validation.js';
import { getFilteredList } from '../modules/reporting.js';

export async function listExpenses(options) {
  const filters = validateListOptions(options);
  const allExpenses = await getExpenses();
  console.table(getFilteredList(allExpenses, filters));
}