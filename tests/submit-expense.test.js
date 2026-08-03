const test = require('node:test');
const assert = require('node:assert/strict');

const submitExpenseModule = require('../api/submit-expense');

const { handler, normalizePayload, VALID_CATEGORIES } = submitExpenseModule;

function createResponseRecorder() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    ended: false,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    }
  };
}

const originalFetch = global.fetch;
const originalScriptUrl = process.env.SCRIPT_URL;

test.afterEach(() => {
  global.fetch = originalFetch;

  if (originalScriptUrl === undefined) {
    delete process.env.SCRIPT_URL;
  } else {
    process.env.SCRIPT_URL = originalScriptUrl;
  }
});

test('normalizePayload trims and formats a valid payload', () => {
  const result = normalizePayload({
    amount: ' 12.5 ',
    category: 'Groceries',
    note: ' coffee '
  });

  assert.deepEqual(result, {
    value: {
      amount: '12.50',
      category: 'Groceries',
      note: 'coffee'
    }
  });
});

test('normalizePayload rejects invalid payload shapes and values', () => {
  assert.equal(normalizePayload(null).error, 'Request body must be a JSON object');
  assert.equal(normalizePayload([]).error, 'Request body must be a JSON object');
  assert.equal(normalizePayload({ amount: '', category: 'Groceries', note: '' }).error, 'Amount is required');
  assert.equal(normalizePayload({ amount: '0', category: 'Groceries', note: '' }).error, 'Amount must be a positive number');
  assert.equal(normalizePayload({ amount: '5', category: '', note: '' }).error, 'Category is required');
  assert.equal(normalizePayload({ amount: '5', category: 'Travel', note: '' }).error, 'Category is invalid');
  assert.equal(normalizePayload({ amount: '5', category: 'Groceries', note: 'x'.repeat(201) }).error, 'Note must be 200 characters or fewer');
});

test('VALID_CATEGORIES includes the supported categories', () => {
  assert.equal(VALID_CATEGORIES.has('Groceries'), true);
  assert.equal(VALID_CATEGORIES.has('Dining Out'), true);
  assert.equal(VALID_CATEGORIES.has('Other'), true);
});

test('handler rejects non-POST requests', async () => {
  const response = createResponseRecorder();

  await handler({ method: 'GET' }, response);

  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, 'POST');
  assert.deepEqual(response.body, { error: 'Method not allowed' });
});

test('handler rejects requests when SCRIPT_URL is missing', async () => {
  delete process.env.SCRIPT_URL;
  const response = createResponseRecorder();

  await handler({ method: 'POST', body: {} }, response);

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, { error: 'SCRIPT_URL is not configured' });
});

test('handler rejects invalid JSON request bodies', async () => {
  process.env.SCRIPT_URL = 'https://example.com/submit';
  const response = createResponseRecorder();

  await handler({ method: 'POST', body: '{bad json' }, response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { error: 'Request body must be valid JSON' });
});

test('handler rejects invalid payloads before forwarding', async () => {
  process.env.SCRIPT_URL = 'https://example.com/submit';
  const response = createResponseRecorder();

  await handler({
    method: 'POST',
    body: { amount: '-1', category: 'Groceries', note: '' }
  }, response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { error: 'Amount must be a positive number' });
});

test('handler forwards normalized payload upstream for valid requests', async () => {
  process.env.SCRIPT_URL = 'https://example.com/submit';
  const response = createResponseRecorder();
  let fetchCall;

  global.fetch = async (url, options) => {
    fetchCall = { url, options };
    return {
      ok: true
    };
  };

  await handler({
    method: 'POST',
    body: { amount: '8.2', category: 'Shopping', note: ' snacks ' }
  }, response);

  assert.equal(response.statusCode, 204);
  assert.equal(response.ended, true);
  assert.equal(fetchCall.url, 'https://example.com/submit');
  assert.deepEqual(fetchCall.options, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: '8.20', category: 'Shopping', note: 'snacks' })
  });
});

test('handler returns 502 when the upstream service rejects the request', async () => {
  process.env.SCRIPT_URL = 'https://example.com/submit';
  const response = createResponseRecorder();

  global.fetch = async () => ({
    ok: false,
    text: async () => 'upstream error details'
  });

  await handler({
    method: 'POST',
    body: { amount: '8.2', category: 'Shopping', note: '' }
  }, response);

  assert.equal(response.statusCode, 502);
  assert.deepEqual(response.body, {
    error: 'Expense service rejected the request',
    details: 'upstream error details'
  });
});

test('handler returns 502 when the upstream call throws', async () => {
  process.env.SCRIPT_URL = 'https://example.com/submit';
  const response = createResponseRecorder();

  global.fetch = async () => {
    throw new Error('network down');
  };

  await handler({
    method: 'POST',
    body: { amount: '8.2', category: 'Shopping', note: '' }
  }, response);

  assert.equal(response.statusCode, 502);
  assert.deepEqual(response.body, {
    error: 'Failed to reach expense service',
    details: 'network down'
  });
});