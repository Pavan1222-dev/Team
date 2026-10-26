import { getExpenses } from '../modules/storage.js';
import { validateListOptions } from '../modules/validation.js';
import { getFilteredList, exportCsv } from '../modules/reporting.js';

export async function exportAction(options) {
  const filters = validateListOptions(options);
  const allExpenses = await getExpenses();
  const filtered = getFilteredList(allExpenses, filters);
  await exportCsv(filtered, options.output);
}