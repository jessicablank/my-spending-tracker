(function (root) {
  'use strict';

  function fail(message) {
    throw new Error(message);
  }

  function money(value, label, allowNegative = false) {
    if (typeof value !== 'number' || !Number.isFinite(value) || (!allowNegative && value < 0)) {
      fail(`${label} must be a ${allowNegative ? 'finite' : 'nonnegative'} number.`);
    }
    const cents = Math.round(value * 100);
    if (!Number.isSafeInteger(cents) || Math.abs(value * 100 - cents) > 0.000001) {
      fail(`${label} must have at most two decimal places and be within the supported range.`);
    }
    return cents;
  }

  function calculateForecast(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) fail('The forecast must be a JSON object.');
    if (typeof data.month !== 'string' || !/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(data.month)) {
      fail('month must use YYYY-MM format.');
    }
    const startingBalance = money(data.startingBalance, 'startingBalance', true);
    const minimumBalance = money(data.minimumBalance, 'minimumBalance');
    const transactions = [];
    for (const [field, type, labelField] of [['paychecks', 'deposit', 'person'], ['bills', 'withdrawal', 'name']]) {
      if (!Array.isArray(data[field])) fail(`${field} must be an array (it can be empty).`);
      data[field].forEach((entry, index) => {
        const label = `${field}[${index}]`;
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) fail(`${label} must be an object.`);
        if (typeof entry[labelField] !== 'string' || !entry[labelField].trim() || entry[labelField].length > 120) {
          fail(`${label}.${labelField} must be a name of 1 to 120 characters.`);
        }
        const parsedDate = new Date(`${entry.date}T12:00:00Z`);
        if (typeof entry.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date) ||
            !entry.date.startsWith(`${data.month}-`) ||
            Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== entry.date) {
          fail(`${label}.date must be a real YYYY-MM-DD date within ${data.month}.`);
        }
        transactions.push({ name: entry[labelField].trim(), date: entry.date, type, amount: money(entry.amount, `${label}.amount`) });
      });
    }
    transactions.sort((first, second) => first.date.localeCompare(second.date) ||
      (first.type === second.type ? 0 : first.type === 'withdrawal' ? -1 : 1));
    let balance = startingBalance;
    let lowestBalance = startingBalance;
    let lowestDate = `${data.month}-01`;
    let totalIncome = 0;
    let totalBills = 0;
    for (const transaction of transactions) {
      balance += transaction.type === 'deposit' ? transaction.amount : -transaction.amount;
      if (transaction.type === 'deposit') totalIncome += transaction.amount;
      else totalBills += transaction.amount;
      if (![balance, totalIncome, totalBills].every(Number.isSafeInteger)) fail('Combined amounts exceed the supported range.');
      transaction.balance = balance;
      if (balance < lowestBalance) {
        lowestBalance = balance;
        lowestDate = transaction.date;
      }
    }
    const transferNeeded = Math.max(0, minimumBalance - lowestBalance);
    const availableForSavings = Math.max(0, lowestBalance - minimumBalance);
    if (![transferNeeded, availableForSavings].every(Number.isSafeInteger)) fail('Transfer amount exceeds the supported range.');
    return { month: data.month, startingBalance, minimumBalance, transactions, endingBalance: balance,
      lowestBalance, lowestDate, totalIncome, totalBills, transferNeeded, availableForSavings };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { calculateForecast };
  else root.CheckingForecast = { calculateForecast };
})(typeof globalThis !== 'undefined' ? globalThis : this);