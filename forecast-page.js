'use strict';

const exampleMonth = {
  month: '2026-11',
  startingBalance: 3200,
  minimumBalance: 500,
  paychecks: [
    { person: 'Me', date: '2026-11-06', amount: 2400 },
    { person: 'Husband', date: '2026-11-13', amount: 2600 },
    { person: 'Me', date: '2026-11-20', amount: 2400 },
    { person: 'Husband', date: '2026-11-27', amount: 2600 }
  ],
  bills: [
    { name: 'Mortgage', date: '2026-11-01', amount: 1900 },
    { name: 'HOA', date: '2026-11-05', amount: 250 },
    { name: 'Credit card - Me', date: '2026-11-06', amount: 875.42 },
    { name: 'Electricity', date: '2026-11-12', amount: 145.80 },
    { name: 'Credit card - Husband', date: '2026-11-18', amount: 1100 },
    { name: 'Water (every two months)', date: '2026-11-22', amount: 120 },
    { name: 'Internet', date: '2026-11-25', amount: 75 }
  ]
};

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const element = id => document.getElementById(id);
const formatMoney = cents => currency.format(cents / 100);
const formatDate = date => dateFormat.format(new Date(`${date}T12:00:00Z`));
let currentData = null;
let currentForecast = null;
let fileVersion = 0;

function setMoney(id, cents, threshold) {
  const target = element(id);
  target.textContent = formatMoney(cents);
  target.classList.toggle('negative', threshold !== undefined && cents < threshold);
  target.classList.toggle('positive', threshold !== undefined && cents >= threshold);
}

function render(result) {
  currentForecast = result;
  element('empty-state').hidden = true;
  element('forecast-results').hidden = false;
  element('month-label').textContent = monthFormat.format(new Date(`${result.month}-01T12:00:00Z`));
  element('transfer-summary').classList.toggle('warning', result.transferNeeded > 0);
  element('transfer-category').textContent = result.transferNeeded > 0 ? 'BELOW CHECKING CUSHION' : 'CHECKING CUSHION COVERED';
  element('transfer-title').textContent = result.transferNeeded > 0
    ? `${formatMoney(result.transferNeeded)} needed from savings`
    : result.availableForSavings > 0 ? `${formatMoney(result.availableForSavings)} savings headroom` : 'Right at your checking cushion';
  element('transfer-detail').textContent = result.transferNeeded > 0
    ? `The lowest balance is ${formatMoney(result.lowestBalance)} on ${formatDate(result.lowestDate)}. This transfer would keep every listed balance at or above ${formatMoney(result.minimumBalance)}.`
    : `The lowest balance stays at or above ${formatMoney(result.minimumBalance)}. Headroom is based on the lowest balance, not the month-end total.`;
  setMoney('starting-balance', result.startingBalance, result.minimumBalance);
  setMoney('total-income', result.totalIncome);
  setMoney('total-bills', result.totalBills);
  setMoney('ending-balance', result.endingBalance, result.minimumBalance);
  setMoney('lowest-balance', result.lowestBalance, result.minimumBalance);
  element('lowest-date').textContent = `on ${formatDate(result.lowestDate)}`;
  const incomeCount = result.transactions.filter(entry => entry.type === 'deposit').length;
  const billCount = result.transactions.length - incomeCount;
  element('paycheck-count').textContent = `${incomeCount} expected paycheck${incomeCount === 1 ? '' : 's'}`;
  element('bill-count').textContent = `${billCount} scheduled bill${billCount === 1 ? '' : 's'}`;
  element('transaction-count').textContent = `${result.transactions.length} transactions`;
  const rows = [{ date: `${result.month}-01`, name: 'Starting balance', amount: 0, type: 'starting', balance: result.startingBalance }, ...result.transactions];
  const fragment = document.createDocumentFragment();
  for (const entry of rows) {
    const row = document.createElement('tr');
    const below = entry.balance < result.minimumBalance;
    row.classList.toggle('below', below);
    const values = [formatDate(entry.date), entry.name,
      entry.type === 'starting' ? '-' : `${entry.type === 'deposit' ? '+' : '-'}${formatMoney(entry.amount)}`,
      formatMoney(entry.balance), below ? 'Below cushion' : 'Cushion covered'];
    values.forEach((value, index) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      if (index === 2 && entry.type !== 'starting') cell.className = entry.type === 'deposit' ? 'positive' : '';
      if (index === 3 || index === 4) cell.className = below ? 'negative' : 'positive';
      row.append(cell);
    });
    fragment.append(row);
  }
  element('timeline-body').replaceChildren(fragment);
  drawChart();
}

function drawChart() {
  if (!currentForecast) return;
  const canvas = element('balance-chart');
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const context = canvas.getContext('2d');
  if (!context) return;
  context.scale(ratio, ratio);
  const result = currentForecast;
  const balances = [result.startingBalance, ...result.transactions.map(entry => entry.balance)];
  const lower = Math.min(0, result.minimumBalance, ...balances);
  const upper = Math.max(0, result.minimumBalance, ...balances);
  const padding = Math.max((upper - lower) * 0.12, 10000);
  const minimum = lower - padding;
  const maximum = upper + padding;
  const left = width < 500 ? 72 : 96;
  const right = width - 10;
  const top = 12;
  const bottom = height - 30;
  const days = new Date(Number(result.month.slice(0, 4)), Number(result.month.slice(5, 7)), 0).getDate();
  const horizontal = day => left + (day - 1) / (days - 1) * (right - left);
  const vertical = balance => bottom - (balance - minimum) / (maximum - minimum) * (bottom - top);
  context.font = '12px Nunito, sans-serif';
  context.fillStyle = '#666f80';
  for (let tick = 0; tick <= 3; tick++) {
    const balance = minimum + (maximum - minimum) * tick / 3;
    const position = vertical(balance);
    context.strokeStyle = '#dfe4e8';
    context.beginPath(); context.moveTo(left, position); context.lineTo(right, position); context.stroke();
    const label = currency.format(balance / 100).replace(/\.00$/, '');
    context.fillText(label, 0, position + 4, left - 8);
  }
  context.strokeStyle = '#9b2226';
  context.setLineDash([5, 5]);
  context.beginPath(); context.moveTo(left, vertical(result.minimumBalance)); context.lineTo(right, vertical(result.minimumBalance)); context.stroke();
  context.setLineDash([]);
  context.strokeStyle = '#246649';
  context.lineWidth = 2.5;
  context.beginPath(); context.moveTo(left, vertical(result.startingBalance));
  let previousBalance = result.startingBalance;
  for (const entry of result.transactions) {
    const position = horizontal(Number(entry.date.slice(8)));
    context.lineTo(position, vertical(previousBalance));
    context.lineTo(position, vertical(entry.balance));
    previousBalance = entry.balance;
  }
  context.lineTo(right, vertical(previousBalance)); context.stroke();
  for (const entry of result.transactions) {
    context.fillStyle = entry.balance < result.minimumBalance ? '#9b2226' : '#246649';
    context.beginPath(); context.arc(horizontal(Number(entry.date.slice(8))), vertical(entry.balance), 3.5, 0, Math.PI * 2); context.fill();
  }
  context.fillStyle = '#666f80';
  context.fillText('1', left, height - 6);
  context.textAlign = 'center'; context.fillText('15', horizontal(15), height - 6);
  context.textAlign = 'right'; context.fillText(String(days), right, height - 6);
  canvas.setAttribute('aria-label', `Projected balance for ${element('month-label').textContent}. Lowest ${formatMoney(result.lowestBalance)} on ${formatDate(result.lowestDate)}; ending ${formatMoney(result.endingBalance)}. Exact balances in the timeline below.`);
}

function loadData(data, source, published = false) {
  const result = CheckingForecast.calculateForecast(data);
  currentData = data;
  element('cushion').value = data.minimumBalance;
  element('cushion').removeAttribute('aria-invalid');
  element('cushion-error').hidden = true;
  element('file-error').hidden = true;
  element('file-status').textContent = published
    ? `${source}. Published forecast; cushion edits apply only to this tab.`
    : `${source}. Local preview only; not uploaded or saved. Reload to return to the published forecast.`;
  render(result);
}

async function loadPublishedForecast() {
  if (window.location.protocol === 'file:') {
    element('file-status').textContent = 'Local preview. Open JSON file to view a forecast; automatic loading requires HTTP or HTTPS.';
    return;
  }
  const version = fileVersion;
  element('file-status').textContent = 'Loading published forecast...';
  try {
    const response = await fetch('./checking-forecast.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not fetch checking-forecast.json (HTTP ${response.status}).`);
    const data = await response.json();
    if (version !== fileVersion) return;
    loadData(data, 'checking-forecast.json', true);
  } catch (error) {
    if (version !== fileVersion) return;
    element('file-status').textContent = 'Published forecast unavailable.';
    element('file-error').textContent = `Could not load published forecast: ${error.message} You can still open a local JSON file to preview it.`;
    element('file-error').hidden = false;
  }
}

element('forecast-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  const version = ++fileVersion;
  event.target.value = '';
  if (!file) return;
  try {
    if (file.size > 1024 * 1024) throw new Error('Choose a JSON file smaller than 1 MB.');
    let data;
    try { data = JSON.parse(await file.text()); }
    catch { throw new Error('The file is not valid JSON. Check its commas, quotes, and brackets.'); }
    if (version !== fileVersion) return;
    loadData(data, file.name);
  } catch (error) {
    if (version !== fileVersion) return;
    element('file-error').textContent = `Could not load forecast: ${error.message}${currentData ? ' The previous forecast is still displayed.' : ''}`;
    element('file-error').hidden = false;
  }
});

element('load-example').addEventListener('click', () => {
  fileVersion++;
  loadData(structuredClone(exampleMonth), 'Example month (sample amounts)');
});

element('download-template').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(exampleMonth, null, 2) + '\n'], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'checking-forecast-template.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

element('cushion').addEventListener('input', event => {
  if (!currentData) return;
  try {
    if (!event.target.value.trim()) throw new Error('Enter a nonnegative cushion with at most two decimals.');
    const candidate = { ...currentData, minimumBalance: Number(event.target.value) };
    const result = CheckingForecast.calculateForecast(candidate);
    currentData = candidate;
    event.target.removeAttribute('aria-invalid');
    element('cushion-error').hidden = true;
    render(result);
  } catch {
    event.target.setAttribute('aria-invalid', 'true');
    element('cushion-error').textContent = 'Enter a nonnegative amount with at most two decimals. Forecast still uses the last valid cushion.';
    element('cushion-error').hidden = false;
  }
});

new ResizeObserver(drawChart).observe(element('balance-chart'));
loadPublishedForecast();