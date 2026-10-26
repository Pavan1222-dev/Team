const ALLOWED_CATEGORIES = ['Food', 'Travel', 'Utilities', 'Entertainment', 'Shopping', 'Other'];
const ALLOWED_PAYMENT_MODES = ['Cash', 'Card', 'UPI', 'Bank Transfer'];


function exitWithError(message) {
  console.log(`Error: ${message}`);
  process.exit(1); 
}

function validateAmount(amountStr) {
  let amount = Number(amountStr);
  
  if (isNaN(amount) === true) {
    exitWithError('Amount must be a real number.');
  }
  
  if (amount <= 0) {
    exitWithError('Amount cannot be negative or zero.');
  }
  
  return amount;
}

function validateDate(dateStr) {
  
  let parts = dateStr.split('-');
  if (parts.length !== 3 || parts[0].length !== 4 || parts[1].length !== 2 || parts[2].length !== 2) {
    exitWithError('Date must be formatted exactly as YYYY-MM-DD');
  }

  
  let parsedDate = new Date(dateStr);
  
  
  if (isNaN(parsedDate.getTime())) {
    exitWithError('That is not a valid calendar date.');
  }

  
  let today = new Date();
  if (parsedDate > today) {
    exitWithError('You cannot log an expense for a future date.');
  }

  return dateStr;
}

function validateCategory(category) {
  let isValid = false;
  
  for (let i = 0; i < ALLOWED_CATEGORIES.length; i++) {
    if (category === ALLOWED_CATEGORIES[i]) {
      isValid = true;
    }
  }

  if (isValid === false) {
    exitWithError(`Unknown category. Please use one of these: ${ALLOWED_CATEGORIES.join(', ')}`);
  }
  
  return category;
}

function validatePaymentMode(mode) {
  let isValid = false;
  
  for (let i = 0; i < ALLOWED_PAYMENT_MODES.length; i++) {
    if (mode === ALLOWED_PAYMENT_MODES[i]) {
      isValid = true;
    }
  }

  if (isValid === false) {
    exitWithError(`Unknown payment mode. Please use one of these: ${ALLOWED_PAYMENT_MODES.join(', ')}`);
  }
  
  return mode;
}

module.exports = {
  ALLOWED_CATEGORIES,
  validateAmount,
  validateDate,
  validateCategory,
  validatePaymentMode,
  exitWithError
};