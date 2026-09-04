// Point this at your deployed backend before publishing the frontend.
// Example once deployed: 'https://textvault-api.onrender.com/api/entries'
const API_BASE_URL = 'https://stub-api.onrender.com/api/entries';

const MAX_WORDS = 5000;
const EDIT_CODE_PATTERN = /^[A-Za-z0-9]{6}$/;

// --- Elements: write ---
const textInput = document.getElementById('text-input');
const wordCountEl = document.getElementById('word-count');
const editCodeInput = document.getElementById('edit-code-input');
const editCodeError = document.getElementById('edit-code-error');
const saveButton = document.getElementById('save-button');
const saveError = document.getElementById('save-error');
const ticket = document.getElementById('ticket');
const ticketCode = document.getElementById('ticket-code');
const ticketNote = document.getElementById('ticket-note');
const copyCodeButton = document.getElementById('copy-code-button');

// --- Elements: retrieve ---
const codeInput = document.getElementById('code-input');
const retrieveButton = document.getElementById('retrieve-button');
const retrieveError = document.getElementById('retrieve-error');
const result = document.getElementById('result');
const resultMeta = document.getElementById('result-meta');
const resultText = document.getElementById('result-text');
const copyTextButton = document.getElementById('copy-text-button');
const downloadPdfButton = document.getElementById('download-pdf-button');

// --- Elements: edit / delete (only usable when the entry has an edit code) ---
const editControls = document.getElementById('edit-controls');
const noEditNote = document.getElementById('no-edit-note');
const updateTextInput = document.getElementById('update-text-input');
const updateWordCount = document.getElementById('update-word-count');
const updateEditCodeInput = document.getElementById('update-edit-code-input');
const updateButton = document.getElementById('update-button');
const updateError = document.getElementById('update-error');
const updateSuccess = document.getElementById('update-success');
const deleteEditCodeInput = document.getElementById('delete-edit-code-input');
const deleteButton = document.getElementById('delete-button');
const deleteError = document.getElementById('delete-error');
const deleteConfirmation = document.getElementById('delete-confirmation');

// Tracks which entry is currently loaded, so update/delete know their target.
let currentResponseId = null;

// --- Helpers ---
function countWords(text) {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

function showError(el, message) {
  el.textContent = message;
  el.hidden = false;
}

function hideError(el) {
  el.hidden = true;
  el.textContent = '';
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 420) + 'px';
}

async function copyToClipboard(text, button, errorEl) {
  try {
    await navigator.clipboard.writeText(text);
    const original = button.textContent;
    button.textContent = 'Copied';
    setTimeout(() => { button.textContent = original; }, 1500);
  } catch (err) {
    showError(errorEl, 'Could not copy — your browser may be blocking clipboard access.');
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

// --- Word counter (write) ---
textInput.addEventListener('input', () => {
  autoResize(textInput);
  const count = countWords(textInput.value);
  wordCountEl.textContent = `${count.toLocaleString()} word${count === 1 ? '' : 's'}`;

  if (count > MAX_WORDS) {
    wordCountEl.classList.add('over-limit');
    saveButton.disabled = true;
  } else {
    wordCountEl.classList.remove('over-limit');
    saveButton.disabled = false;
  }
});

// --- Save ---
saveButton.addEventListener('click', async () => {
  hideError(saveError);
  hideError(editCodeError);
  const text = textInput.value.trim();
  const editCode = editCodeInput.value.trim();

  if (text.length === 0) {
    showError(saveError, 'Write something before saving.');
    return;
  }
  if (countWords(text) > MAX_WORDS) {
    showError(saveError, `That's over the ${MAX_WORDS.toLocaleString()}-word limit. Trim it down and try again.`);
    return;
  }
  if (editCode.length > 0 && !EDIT_CODE_PATTERN.test(editCode)) {
    showError(editCodeError, 'Edit code must be exactly 6 letters and/or numbers, or left blank.');
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = 'Saving…';

  try {
    const payload = editCode.length > 0 ? { text, editCode } : { text };
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      showError(saveError, data.error || 'Something went wrong. Please try again.');
      return;
    }

    ticketCode.textContent = data.responseId;
    ticketNote.textContent = data.hasEditCode
      ? "Save this code to read your text again, and remember your edit code to update or delete it later. Kept for 1 year, then removed."
      : "Save this. You'll need it to read your text again — it's kept for 1 year, then removed. No edit code was set, so this entry can only be read, not changed.";
    ticket.hidden = false;
    ticket.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    showError(saveError, 'Could not reach the server. Check your connection and try again.');
  } finally {
    saveButton.disabled = countWords(textInput.value) > MAX_WORDS;
    saveButton.textContent = 'Save';
  }
});

copyCodeButton.addEventListener('click', () => copyToClipboard(ticketCode.textContent, copyCodeButton, saveError));

// --- Retrieve ---
retrieveButton.addEventListener('click', async () => {
  hideError(retrieveError);
  result.hidden = true;
  deleteConfirmation.hidden = true;
  currentResponseId = null;

  const code = codeInput.value.trim();
  if (code.length === 0) {
    showError(retrieveError, 'Enter a code first.');
    return;
  }

  retrieveButton.disabled = true;
  retrieveButton.textContent = 'Looking up…';

  try {
    const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(code)}`);
    const data = await response.json();

    if (!response.ok) {
      showError(retrieveError, data.error || 'Something went wrong. Please try again.');
      return;
    }

    currentResponseId = data.responseId;
    resultMeta.textContent = data.updatedAt
      ? `Saved ${formatDate(data.createdAt)} · last updated ${formatDate(data.updatedAt)}`
      : `Saved ${formatDate(data.createdAt)}`;
    resultText.textContent = data.text;
    result.hidden = false;

    // Reset the edit/delete subforms for this newly-loaded entry.
    hideError(updateError);
    updateSuccess.hidden = true;
    hideError(deleteError);
    updateEditCodeInput.value = '';
    deleteEditCodeInput.value = '';
    updateTextInput.value = data.text;
    autoResize(updateTextInput);
    const count = countWords(data.text);
    updateWordCount.textContent = `${count.toLocaleString()} word${count === 1 ? '' : 's'}`;
    updateWordCount.classList.remove('over-limit');

    if (data.hasEditCode) {
      editControls.hidden = false;
      noEditNote.hidden = true;
    } else {
      editControls.hidden = true;
      noEditNote.hidden = false;
    }

    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    showError(retrieveError, 'Could not reach the server. Check your connection and try again.');
  } finally {
    retrieveButton.disabled = false;
    retrieveButton.textContent = 'Retrieve';
  }
});

codeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') retrieveButton.click();
});

copyTextButton.addEventListener('click', () => copyToClipboard(resultText.textContent, copyTextButton, retrieveError));

downloadPdfButton.addEventListener('click', () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48;
  const maxWidth = 595 - marginX * 2; // A4 width in pt minus margins
  const lines = doc.splitTextToSize(resultText.textContent, maxWidth);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  let cursorY = 56;
  const lineHeight = 15;
  const pageHeight = 842; // A4 height in pt

  lines.forEach((line) => {
    if (cursorY > pageHeight - 56) {
      doc.addPage();
      cursorY = 56;
    }
    doc.text(line, marginX, cursorY);
    cursorY += lineHeight;
  });

  doc.save('text.pdf');
});

// --- Update ---
updateTextInput.addEventListener('input', () => {
  autoResize(updateTextInput);
  const count = countWords(updateTextInput.value);
  updateWordCount.textContent = `${count.toLocaleString()} word${count === 1 ? '' : 's'}`;
  updateWordCount.classList.toggle('over-limit', count > MAX_WORDS);
  updateButton.disabled = count > MAX_WORDS;
});

updateButton.addEventListener('click', async () => {
  hideError(updateError);
  updateSuccess.hidden = true;

  if (!currentResponseId) return;

  const text = updateTextInput.value.trim();
  const editCode = updateEditCodeInput.value.trim();

  if (text.length === 0) {
    showError(updateError, 'Text cannot be empty.');
    return;
  }
  if (countWords(text) > MAX_WORDS) {
    showError(updateError, `That's over the ${MAX_WORDS.toLocaleString()}-word limit. Trim it down and try again.`);
    return;
  }
  if (!EDIT_CODE_PATTERN.test(editCode)) {
    showError(updateError, 'Enter your 6-character edit code.');
    return;
  }

  updateButton.disabled = true;
  updateButton.textContent = 'Saving…';

  try {
    const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(currentResponseId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, editCode }),
    });
    const data = await response.json();

    if (!response.ok) {
      showError(updateError, data.error || 'Something went wrong. Please try again.');
      return;
    }

    resultText.textContent = data.text;
    resultMeta.textContent = `Saved ${formatDate(data.createdAt)} · last updated ${formatDate(data.updatedAt)}`;
    updateSuccess.hidden = false;
  } catch (err) {
    showError(updateError, 'Could not reach the server. Check your connection and try again.');
  } finally {
    updateButton.disabled = countWords(updateTextInput.value) > MAX_WORDS;
    updateButton.textContent = 'Save changes';
  }
});

// --- Delete ---
deleteButton.addEventListener('click', async () => {
  hideError(deleteError);

  if (!currentResponseId) return;

  const editCode = deleteEditCodeInput.value.trim();
  if (!EDIT_CODE_PATTERN.test(editCode)) {
    showError(deleteError, 'Enter your 6-character edit code.');
    return;
  }

  const confirmed = window.confirm('Delete this entry permanently? This cannot be undone.');
  if (!confirmed) return;

  deleteButton.disabled = true;
  deleteButton.textContent = 'Deleting…';

  try {
    const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(currentResponseId)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editCode }),
    });
    const data = await response.json();

    if (!response.ok) {
      showError(deleteError, data.error || 'Something went wrong. Please try again.');
      return;
    }

    result.hidden = true;
    deleteConfirmation.hidden = false;
    currentResponseId = null;
    codeInput.value = '';
  } catch (err) {
    showError(deleteError, 'Could not reach the server. Check your connection and try again.');
  } finally {
    deleteButton.disabled = false;
    deleteButton.textContent = 'Delete permanently';
  }
});

// --- Info tooltip (tap-to-toggle, works for mouse, touch, and keyboard) ---
document.querySelectorAll('.info-tip').forEach((button) => {
  const bubble = button.nextElementSibling;
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    const isOpen = bubble.classList.contains('is-visible');
    document.querySelectorAll('.tip-bubble.is-visible').forEach((b) => b.classList.remove('is-visible'));
    document.querySelectorAll('.info-tip[aria-expanded="true"]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    if (!isOpen) {
      bubble.classList.add('is-visible');
      button.setAttribute('aria-expanded', 'true');
    }
  });
});

document.addEventListener('click', () => {
  document.querySelectorAll('.tip-bubble.is-visible').forEach((b) => b.classList.remove('is-visible'));
  document.querySelectorAll('.info-tip[aria-expanded="true"]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    document.querySelectorAll('.tip-bubble.is-visible').forEach((b) => b.classList.remove('is-visible'));
    document.querySelectorAll('.info-tip[aria-expanded="true"]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }
});
