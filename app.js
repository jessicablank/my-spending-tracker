const SAVE_EXPENSE_URL = '/api/submit-expense';
const VALID_CATEGORIES = new Set([
  'Groceries',
  'Dining Out',
  'Utilities & Bills',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Other'
]);

const expenseForm = document.getElementById('expenseForm');
const submitButton = document.getElementById('submitBtn');
const status = document.getElementById('status');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const noteInput = document.getElementById('note');

function showStatus(state, message) {
  status.className = state;
  status.textContent = message;
}

function hideStatus() {
  status.className = '';
  status.textContent = '';
}

function resetFieldState() {
  amountInput.classList.remove('field-error');
  categoryInput.classList.remove('field-error');
  noteInput.classList.remove('field-error');
}

function markFieldError(field, message) {
  field.classList.add('field-error');
  field.focus();
  showStatus('error', `❌ ${message}`);
}

function buildPayload() {
  return {
    amount: amountInput.value.trim(),
    category: categoryInput.value.trim(),
    note: noteInput.value.trim()
  };
}

function validatePayload(payload) {
  if (!payload.amount) {
    markFieldError(amountInput, 'Amount is required.');
    return false;
  }

  const amount = Number(payload.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    markFieldError(amountInput, 'Amount must be a positive number.');
    return false;
  }

  if (!payload.category) {
    markFieldError(categoryInput, 'Category is required.');
    return false;
  }

  if (!VALID_CATEGORIES.has(payload.category)) {
    markFieldError(categoryInput, 'Category is invalid.');
    return false;
  }

  if (payload.note.length > 200) {
    markFieldError(noteInput, 'Note must be 200 characters or fewer.');
    return false;
  }

  payload.amount = amount.toFixed(2);
  return true;
}

expenseForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  resetFieldState();

  const payload = buildPayload();

  if (!validatePayload(payload)) {
    return;
  }

  submitButton.disabled = true;
  showStatus('saving', 'Saving expense...');

  try {
    const response = await fetch(SAVE_EXPENSE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let message = 'Failed to save expense. Please try again.';

      try {
        const errorPayload = await response.json();

        if (errorPayload && typeof errorPayload.error === 'string') {
          message = errorPayload.error;
        }
      } catch {
      }

      throw new Error(message);
    }

    showStatus('success', '✨ Expense saved successfully!');
    amountInput.value = '';
    noteInput.value = '';
    resetFieldState();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save expense. Please try again.';
    showStatus('error', `❌ ${message}`);
  } finally {
    submitButton.disabled = false;
    setTimeout(() => {
      if (status.className === 'success') {
        hideStatus();
      }
    }, 3000);
  }
});

amountInput.addEventListener('input', () => {
  amountInput.classList.remove('field-error');
});

categoryInput.addEventListener('change', () => {
  categoryInput.classList.remove('field-error');
});

noteInput.addEventListener('input', () => {
  noteInput.classList.remove('field-error');
});