const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { calculateForecast } = require('../forecast-calculator');
const publishedData = require('../checking-forecast.json');
const source = fs.readFileSync(path.join(__dirname, '../forecast-page.js'), 'utf8');

function createPage(fetch, protocol = 'https:') {
  const elements = new Map();
  function createElement() {
    return { textContent: '', hidden: true, value: '', clientWidth: 1000, clientHeight: 250,
      classList: { toggle() {} }, listeners: {},
      addEventListener(name, handler) { this.listeners[name] = handler; },
      setAttribute() {}, removeAttribute() {}, append() {}, replaceChildren() {}, getContext() { return null; } };
  }
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, createElement());
      return elements.get(id);
    },
    createElement,
    createDocumentFragment: createElement
  };
  vm.runInNewContext(source, { document, window: { location: { protocol }, devicePixelRatio: 1 },
    fetch, Intl, CheckingForecast: { calculateForecast }, structuredClone,
    ResizeObserver: class { observe() {} } });
  return id => document.getElementById(id);
}

const settle = () => new Promise(resolve => setImmediate(resolve));

test('published JSON is valid and automatically renders without cached fetches', async () => {
  let request;
  const element = createPage(async (url, options) => {
    request = { url, cache: options.cache };
    return { ok: true, json: async () => publishedData };
  });
  await settle();
  assert.deepEqual(request, { url: './checking-forecast.json', cache: 'no-store' });
  assert.equal(element('forecast-results').hidden, false);
  assert.equal(element('transfer-title').textContent, '$325.42 needed from savings');
  assert.match(element('file-status').textContent, /Published forecast/);
});

test('missing, malformed, or invalid published data gives a recoverable error', async () => {
  for (const fetch of [
    async () => ({ ok: false, status: 404 }),
    async () => ({ ok: true, json: async () => { throw new SyntaxError('Invalid JSON'); } }),
    async () => ({ ok: true, json: async () => ({ month: 'bad' }) }),
    async () => { throw new Error('Network unavailable'); }
  ]) {
    const element = createPage(fetch);
    await settle();
    assert.equal(element('file-error').hidden, false);
    assert.match(element('file-error').textContent, /Could not load published forecast/);
    assert.equal(element('forecast-results').hidden, true);
    assert.equal(typeof element('forecast-file').listeners.change, 'function');
  }
});

test('local file preview wins over a delayed published response', async () => {
  let resolveResponse;
  const element = createPage(() => new Promise(resolve => { resolveResponse = resolve; }));
  const localData = { ...publishedData, startingBalance: 10000 };
  await element('forecast-file').listeners.change({ target: {
    files: [{ name: 'preview.json', size: 100, text: async () => JSON.stringify(localData) }], value: 'preview.json'
  } });
  const previewSummary = element('transfer-title').textContent;
  resolveResponse({ ok: true, json: async () => publishedData });
  await settle();
  assert.equal(element('transfer-title').textContent, previewSummary);
  assert.match(element('file-status').textContent, /preview.json. Local preview/);
});

test('direct local HTML keeps file picker without attempting a blocked fetch', async () => {
  let fetched = false;
  const element = createPage(async () => { fetched = true; }, 'file:');
  await settle();
  assert.equal(fetched, false);
  assert.match(element('file-status').textContent, /automatic loading requires HTTP/);
});