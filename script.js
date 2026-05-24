// Student Quiz Page
const DEFAULT_TIMER = 60; // seconds (change if you want)
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyAsxh6kTVeBcdBRHgCjXayKxblELLWUu0gxwuWcAWNrp9UeGfaAEpm9ljG5JSUmil15w/exec';

const studentForm = document.getElementById('studentForm');
const nameEntry = document.getElementById('nameEntry');
const quizArea = document.getElementById('quizArea');
const resultArea = document.getElementById('resultArea');
const leaderboardArea = document.getElementById('leaderboardArea');
const questionText = document.getElementById('questionText');
const optionsContainer = document.getElementById('optionsContainer');
const questionMeta = document.getElementById('questionMeta');
const nextBtn = document.getElementById('nextBtn');
const restartBtn = document.getElementById('restartBtn');
const timerValue = document.getElementById('timerValue');
const timerBadge = document.getElementById('timerBadge');
const selectionHint = document.getElementById('selectionHint');

let questions = [];
let currentIndex = 0;
let answers = [];
let timerId = null;
let timeLeft = DEFAULT_TIMER;
let timerDuration = DEFAULT_TIMER;
let studentName = '';

function isWebAppConfigured() {
  return !WEB_APP_URL.includes('PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE');
}

async function fetchQuestions() {
  if (!isWebAppConfigured()) {
    throw new Error('Paste your Google Apps Script Web App URL into script.js before using the quiz.');
  }

  const response = await fetch(`${WEB_APP_URL}?mode=questions`, {
    cache: 'no-store'
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Could not load questions.');
  }

  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    throw new Error('No questions were found in Google Sheets.');
  }

  questions = data.questions;
  timerDuration = Number(data.settings?.timerSeconds) || DEFAULT_TIMER;
  timeLeft = timerDuration;
  answers = new Array(questions.length).fill(undefined);
}

async function sendScoreToSheet(scoreData) {
  const response = await fetch(WEB_APP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      mode: 'saveScore',
      name: scoreData.name,
      score: scoreData.score,
      total: scoreData.total,
      percentage: scoreData.percentage,
      timeTaken: scoreData.timeTaken
    })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Could not save score.');
  }

  if (!result.success) {
    throw new Error(result.message || 'Could not save score.');
  }

  return result;
}

async function loadLeaderboard() {
  if (!isWebAppConfigured()) {
    leaderboardArea.innerHTML = `
      <h2>Leaderboard</h2>
      <div class="empty-state">Paste your Google Apps Script Web App URL into script.js to enable the leaderboard.</div>
    `;
    leaderboardArea.classList.remove('hidden');
    return;
  }

  const response = await fetch(`${WEB_APP_URL}?mode=leaderboard`, {
    cache: 'no-store'
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Could not load leaderboard.');
  }

  if (!Array.isArray(data) || data.length === 0) {
    leaderboardArea.innerHTML = `
      <h2>Leaderboard</h2>
      <div class="empty-state">No scores yet. Complete the quiz to appear here.</div>
    `;
    leaderboardArea.classList.remove('hidden');
    return;
  }

  leaderboardArea.innerHTML = `
    <h2>Leaderboard</h2>
    <div class="leaderboard-list">
      ${data
        .map((entry, index) => `
          <div class="leaderboard-item">
            <span>#${index + 1} <strong>${entry.name}</strong></span>
            <span>${entry.score} / ${entry.total}</span>
          </div>
        `)
        .join('')}
    </div>
  `;
  leaderboardArea.classList.remove('hidden');
}

function showWarning(message) {
  selectionHint.textContent = message;
  selectionHint.style.color = '#fca5a5';
}

function resetHint() {
  selectionHint.textContent = 'Select an option to continue.';
  selectionHint.style.color = '';
}

function updateTimerDisplay() {
  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const seconds = String(timeLeft % 60).padStart(2, '0');
  timerValue.textContent = `${minutes}:${seconds}`;

  timerBadge.classList.remove('warning', 'critical');

  if (timeLeft <= 10) {
    timerBadge.classList.add('critical');
  } else if (timeLeft <= 20) {
    timerBadge.classList.add('warning');
  }
}

function startTimer() {
  clearInterval(timerId);
  updateTimerDisplay();

  timerId = setInterval(() => {
    if (timeLeft <= 0) {
      clearInterval(timerId);
      submitQuiz();
      return;
    }

    timeLeft -= 1;
    updateTimerDisplay();
  }, 1000);
}

function renderQuestion() {
  const question = questions[currentIndex];
  questionMeta.textContent = `Question ${currentIndex + 1} of ${questions.length}`;
  questionText.textContent = question.text;

  optionsContainer.innerHTML = Object.entries(question.options)
    .map(([label, value]) => `
      <button
        type="button"
        class="option-btn ${answers[currentIndex] === label ? 'selected' : ''}"
        data-option="${label}"
      >
        ${label}. ${value}
      </button>
    `)
    .join('');

  const optionButtons = optionsContainer.querySelectorAll('.option-btn');

  optionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      answers[currentIndex] = button.dataset.option;
      optionButtons.forEach((btn) => btn.classList.remove('selected'));
      button.classList.add('selected');
      resetHint();
    });
  });

  nextBtn.textContent = currentIndex === questions.length - 1 ? 'Submit' : 'Next';
}

async function submitQuiz() {
  clearInterval(timerId);

  const score = answers.reduce((total, answer, index) => {
    return total + (answer === questions[index].correctAnswer ? 1 : 0);
  }, 0);

  const total = questions.length;
  const percentage = Math.round((score / total) * 100);
  const timeTaken = timerDuration - timeLeft;

  try {
    await sendScoreToSheet({
      name: studentName,
      score,
      total,
      percentage,
      timeTaken
    });

    resultArea.innerHTML = `
      <h2>Quiz Complete</h2>
      <p><strong>Student:</strong> ${studentName}</p>
      <div class="score-pill">${score}/${total} (${percentage}%)</div>
      <p>Your score has been saved to Google Sheets.</p>
    `;

    resultArea.classList.remove('hidden');
    quizArea.classList.add('hidden');
    restartBtn.classList.remove('hidden');
    leaderboardArea.classList.add('hidden');

    await loadLeaderboard();
  } catch (error) {
    resultArea.innerHTML = `
      <h2>Quiz Complete</h2>
      <p><strong>Student:</strong> ${studentName}</p>
      <div class="score-pill">${score}/${total} (${percentage}%)</div>
      <p style="color:#fca5a5;">${error.message}</p>
    `;

    resultArea.classList.remove('hidden');
    quizArea.classList.add('hidden');
    restartBtn.classList.remove('hidden');
  }
}

function nextQuestion() {
  if (answers[currentIndex] === undefined) {
    showWarning('Please select an option before continuing.');
    return;
  }

  resetHint();

  if (currentIndex < questions.length - 1) {
    currentIndex += 1;
    renderQuestion();
    return;
  }

  submitQuiz();
}

async function startQuiz() {
  try {
    await fetchQuestions();
    currentIndex = 0;
    answers = new Array(questions.length).fill(undefined);

    nameEntry.classList.add('hidden');
    quizArea.classList.remove('hidden');
    resultArea.classList.add('hidden');
    leaderboardArea.classList.add('hidden');
    restartBtn.classList.add('hidden');

    renderQuestion();
    startTimer();
  } catch (error) {
    resultArea.innerHTML = `
      <h2>Unable to load quiz</h2>
      <p>${error.message}</p>
    `;
    resultArea.classList.remove('hidden');
    quizArea.classList.add('hidden');
  }
}

studentForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  studentName = document.getElementById('studentName').value.trim();

  if (!studentName) {
    showWarning('Please enter your name to continue.');
    return;
  }

  await startQuiz();
});

nextBtn.addEventListener('click', nextQuestion);

restartBtn.addEventListener('click', () => {
  nameEntry.classList.remove('hidden');
  quizArea.classList.add('hidden');
  resultArea.classList.add('hidden');
  leaderboardArea.classList.add('hidden');
  document.getElementById('studentName').value = '';
  studentName = '';
  clearInterval(timerId);
});

loadLeaderboard();
