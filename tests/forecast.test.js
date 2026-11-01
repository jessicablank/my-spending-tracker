const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateForecast } = require('../forecast-calculator');

function sample(overrides = {}) {
  return { month: '2026-11', startingBalance: 1000, minimumBalance: 500,
    paychecks: [{ person: 'Me', date: '2026-11-05', amount: 2000 }],
    bills: [{ name: 'Mortgage', date: '2026-11-05', amount: 1200 }], ...overrides };
}

test('withdrawals precede same-day deposits and reveal the temporary shortfall', () => {
  const result = calculateForecast(sample());
  assert.deepEqual(result.transactions.map(entry => entry.balance), [-20000, 180000]);
  assert.equal(result.lowestBalance, -20000);
  assert.equal(result.lowestDate, '2026-11-05');
  assert.equal(result.transferNeeded, 70000);
  assert.equal(result.availableForSavings, 0);
  assert.equal(result.totalIncome, 200000);
  assert.equal(result.totalBills, 120000);
});

test('starting balance limits savings even when later balances are higher', () => {
  const result = calculateForecast(sample({ bills: [] }));
  assert.equal(result.availableForSavings, 50000);
  assert.equal(result.lowestDate, '2026-11-01');
});

test('empty months and balances exactly at the cushion need no transfer', () => {
  const result = calculateForecast(sample({ startingBalance: 500, bills: [], paychecks: [] }));
  assert.equal(result.endingBalance, 50000);
  assert.equal(result.transferNeeded, 0);
  assert.equal(result.availableForSavings, 0);
});

test('sorts unsorted transactions and performs exact cent arithmetic', () => {
  const result = calculateForecast(sample({ startingBalance: 0.3, minimumBalance: 0, paychecks: [], bills: [
    { name: 'Second', date: '2026-11-12', amount: 0.2 },
    { name: 'First', date: '2026-11-02', amount: 0.1 }
  ] }));
  assert.equal(result.transactions[0].name, 'First');
  assert.equal(result.endingBalance, 0);
});

test('rejects malformed data, invalid dates, and unsupported amounts', () => {
  for (const data of [null, [], sample({ month: '2026-13' }), sample({ minimumBalance: -1 }),
    sample({ startingBalance: '1000' }), sample({ startingBalance: 1.001 }),
    sample({ bills: null }), sample({ paychecks: [{ person: '', date: '2026-11-01', amount: 1 }] }),
    ...['2026-11-31', '2026-12-01', '2026-11-00', '2026-11-99'].map(date =>
      sample({ bills: [{ name: 'Bill', date, amount: 1 }] })),
    sample({ bills: [{ name: 'Bill', date: '2026-11-01', amount: -1 }] }),
    sample({ startingBalance: Infinity }), sample({ startingBalance: Number.MAX_SAFE_INTEGER })]) {
    assert.throws(() => calculateForecast(data));
  }
});

test('supports negative starting balances and leap days', () => {
  assert.equal(calculateForecast(sample({ startingBalance: -20, bills: [], paychecks: [] })).transferNeeded, 52000);
  assert.doesNotThrow(() => calculateForecast(sample({ month: '2028-02', paychecks: [],
    bills: [{ name: 'Bill', date: '2028-02-29', amount: 1 }] })));
});

test('impossible dates report the affected JSON field', () => {
  assert.throws(() => calculateForecast(sample({ bills: [{ name: 'Bill', date: '2026-11-99', amount: 1 }] })),
    /bills\[0\]\.date must be a real YYYY-MM-DD date/);
});