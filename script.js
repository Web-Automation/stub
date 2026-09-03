// Point this at your deployed backend before publishing the frontend.
// Example once deployed: 'https://textvault-api.onrender.com/api/entries'
const API_BASE_URL = 'http://localhost:3000/api/entries';

const MAX_WORDS = 5000;

// --- Elements ---
const textInput = document.getElementById('text-input');
const wordCountEl = document.getElementById('word-count');
const saveButton = document.getElementById('save-button');
const saveError = document.getElementById('save-error');
const ticket = document.getElementById('ticket');
const ticketCode = document.getElementById('ticket-code');
const copyCodeButton = document.getElementById('copy-code-button');

const codeInput = document.getElementById('code-input');
const retrieveButton = document.getElementById('retrieve-button');
const retrieveError = document.getElementById('retrieve-error');
const result = document.getElementById('result');
const resultMeta = document.getElementById('result-meta');
const resultText = document.getElementById('result-text');
const copyTextButton = document.getElementById('copy-text-button');
const downloadPdfButton = document.getElementById('download-pdf-button');

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

// --- Word counter ---
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
  const text = textInput.value.trim();

  if (text.length === 0) {
    showError(saveError, 'Write something before saving.');
    return;
  }
  if (countWords(text) > MAX_WORDS) {
    showError(saveError, `That's over the ${MAX_WORDS.toLocaleString()}-word limit. Trim it down and try again.`);
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = 'Saving…';

  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await response.json();

    if (!response.ok) {
      showError(saveError, data.error || 'Something went wrong. Please try again.');
      return;
    }

    ticketCode.textContent = data.responseId;
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

    const created = new Date(data.createdAt);
    resultMeta.textContent = `Saved ${created.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}`;
    resultText.textContent = data.text;
    result.hidden = false;
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
