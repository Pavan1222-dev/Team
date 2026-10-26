import { getExpenses } from '../modules/storage.js';
import { printSummary } from '../modules/reporting.js';

export async function showSummaryAction() {
  printSummary(await getExpenses());
}