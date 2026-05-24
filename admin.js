// Admin guidance for Google Sheets backend
const adminMessage = document.getElementById('adminMessage');
const webAppUrlInput = document.getElementById('webAppUrlInput');
const saveUrlBtn = document.getElementById('saveUrlBtn');
const clearUrlBtn = document.getElementById('clearUrlBtn');
const STORAGE_KEY = 'quizGoogleWebAppUrl';

function showMessage(text, tone = 'info') {
  const colors = {
    info: '#e2e8f0',
    success: '#bbf7d0',
    danger: '#fecaca'
  };

  adminMessage.textContent = text;
  adminMessage.style.color = colors[tone] || colors.info;
}

function loadSavedUrl() {
  const savedUrl = localStorage.getItem(STORAGE_KEY);
  if (savedUrl) {
    webAppUrlInput.value = savedUrl;
  }
}

function saveUrl() {
  const url = webAppUrlInput.value.trim();

  if (!url) {
    showMessage('Paste your Google Apps Script Web App URL to continue.', 'danger');
    return;
  }

  localStorage.setItem(STORAGE_KEY, url);
  showMessage('Web App URL saved. The student page will use it automatically.', 'success');
}

function clearUrl() {
  localStorage.removeItem(STORAGE_KEY);
  webAppUrlInput.value = '';
  showMessage('Saved URL cleared. Paste a new one to connect the quiz.', 'info');
}

loadSavedUrl();
showMessage('Edit questions directly in the Google Sheet named Questions. Scores are saved automatically when students submit the quiz.', 'success');

saveUrlBtn.addEventListener('click', saveUrl);
clearUrlBtn.addEventListener('click', clearUrl);
