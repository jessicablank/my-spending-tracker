const VALID_CATEGORIES = new Set([
  'Groceries',
  'Dining Out',
  'Utilities & Bills',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Other'
]);

function normalizePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { error: 'Request body must be a JSON object' };
  }

  const amountValue = String(payload.amount ?? '').trim();
  const categoryValue = String(payload.category ?? '').trim();
  const noteValue = String(payload.note ?? '').trim();

  if (!amountValue) {
    return { error: 'Amount is required' };
  }

  const amount = Number(amountValue);

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'Amount must be a positive number' };
  }

  if (!categoryValue) {
    return { error: 'Category is required' };
  }

  if (!VALID_CATEGORIES.has(categoryValue)) {
    return { error: 'Category is invalid' };
  }

  if (noteValue.length > 200) {
    return { error: 'Note must be 200 characters or fewer' };
  }

  return {
    value: {
      amount: amount.toFixed(2),
      category: categoryValue,
      note: noteValue
    }
  };
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const scriptUrl = process.env.SCRIPT_URL;

  if (!scriptUrl) {
    return res.status(500).json({ error: 'SCRIPT_URL is not configured' });
  }

  let payload = req.body || {};

  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload || '{}');
    } catch {
      return res.status(400).json({ error: 'Request body must be valid JSON' });
    }
  }

  const normalizedPayload = normalizePayload(payload);

  if (normalizedPayload.error) {
    return res.status(400).json({ error: normalizedPayload.error });
  }

  try {
    const upstreamResponse = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizedPayload.value)
    });

    if (!upstreamResponse.ok) {
      const details = await upstreamResponse.text();
      return res.status(502).json({
        error: 'Expense service rejected the request',
        details: details.slice(0, 500)
      });
    }

    return res.status(204).end();
  } catch (error) {
    return res.status(502).json({
      error: 'Failed to reach expense service',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

module.exports = handler;
module.exports.handler = handler;
module.exports.normalizePayload = normalizePayload;
module.exports.VALID_CATEGORIES = VALID_CATEGORIES;