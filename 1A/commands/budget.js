
import { loadBudgets, saveBudgets } from '../budget.js';
import { validateCategory, validateAmount } from '../validation.js';

export async function setBudget(category, amount) {
    const validCategory = validateCategory(category);
    const validAmount = validateAmount(amount);

    const budgets = await loadBudgets();
    budgets[validCategory] = validAmount;

    await saveBudgets(budgets);

    console.log(`Monthly budget for ${validCategory} set to ₹${validAmount.toFixed(2)}`);
}
