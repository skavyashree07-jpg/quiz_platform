// =====================
// Student Quiz Page FIXED
// =====================

const DEFAULT_TIMER = 60;
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyAsxh6kTVeBcdBRHgCjXayKxblELLWUu0gxwuWcAWNrp9UeGfaAEpm9ljG5JSUmil15w/exec';

document.addEventListener("DOMContentLoaded", function () {

  // ---------------- DOM ELEMENTS ----------------
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

  // ---------------- STATE ----------------
  let questions = [];
  let currentIndex = 0;
  let answers = [];
  let timerId = null;
  let timeLeft;
  let timerDuration;
  let studentName = '';

  // ---------------- HELPERS ----------------
  function isWebAppConfigured() {
    return WEB_APP_URL && !WEB_APP_URL.includes('https://script.google.com/macros/s/AKfycbyAsxh6kTVeBcdBRHgCjXayKxblELLWUu0gxwuWcAWNrp9UeGfaAEpm9ljG5JSUmil15w/exec');
  }

  function showWarning(message) {
    selectionHint.textContent = message;
    selectionHint.style.color = '#fca5a5';
  }

  function resetHint() {
    selectionHint.textContent = 'Select an option to continue.';
    selectionHint.style.color = '';
  }

  // ---------------- FETCH QUESTIONS ----------------
  async function fetchQuestions() {
    if (!isWebAppConfigured()) {
      throw new Error('Web App URL not configured.');
    }

    const response = await fetch(`${WEB_APP_URL}?mode=questions`, {
      cache: 'no-store'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Could not load questions.');
    }

    questions = data.questions;

    timerDuration = Number(data.settings?.timerSeconds) || DEFAULT_TIMER;
    timeLeft = timerDuration;

    answers = new Array(questions.length).fill(undefined);
  }

  // ---------------- LEADERBOARD ----------------
  async function loadLeaderboard() {
    try {
      if (!isWebAppConfigured()) return;

      const response = await fetch(`${WEB_APP_URL}?mode=leaderboard`, {
        cache: 'no-store'
      });

      const data = await response.json();

      if (!Array.isArray(data)) return;

      leaderboardArea.innerHTML = `
        <h2>Leaderboard</h2>
        <div class="leaderboard-list">
          ${data.map((entry, index) => `
            <div class="leaderboard-item">
              <span>#${index + 1} <strong>${entry.name}</strong></span>
              <span>${entry.score} / ${entry.total}</span>
            </div>
          `).join('')}
        </div>
      `;

      leaderboardArea.classList.remove('hidden');
    } catch (err) {
      console.log("Leaderboard error:", err.message);
    }
  }

  // ---------------- TIMER ----------------
  function updateTimerDisplay() {
    const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const seconds = String(timeLeft % 60).padStart(2, '0');
    timerValue.textContent = `${minutes}:${seconds}`;

    timerBadge.classList.remove('warning', 'critical');

    if (timeLeft <= 10) timerBadge.classList.add('critical');
    else if (timeLeft <= 20) timerBadge.classList.add('warning');
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

      timeLeft--;
      updateTimerDisplay();
    }, 1000);
  }

  // ---------------- QUESTIONS ----------------
  function renderQuestion() {
    const q = questions[currentIndex];

    questionMeta.textContent = `Question ${currentIndex + 1} of ${questions.length}`;
    questionText.textContent = q.text;

    optionsContainer.innerHTML = Object.entries(q.options).map(([label, value]) => `
      <button type="button" class="option-btn ${answers[currentIndex] === label ? 'selected' : ''}"
        data-option="${label}">
        ${label}. ${value}
      </button>
    `).join('');

    document.querySelectorAll('.option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        answers[currentIndex] = btn.dataset.option;
        document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        resetHint();
      });
    });

    nextBtn.textContent = currentIndex === questions.length - 1 ? 'Submit' : 'Next';
  }

  // ---------------- SCORE ----------------
  async function submitQuiz() {
    clearInterval(timerId);

   const score = answers.reduce((total, ans, i) =>
  total + (
    ans &&
    ans.toString().trim().toUpperCase() ===
    questions[i].correctAnswer.toString().trim().toUpperCase()
    ? 1 : 0
  ), 0
);

    const total = questions.length;
    const percentage = Math.round((score / total) * 100);
    const timeTaken = timerDuration - timeLeft;

    resultArea.innerHTML = `
      <h2>Quiz Complete</h2>
      <p><strong>Student:</strong> ${studentName}</p>
      <div class="score-pill">${score}/${total} (${percentage}%)</div>
    `;

    resultArea.classList.remove('hidden');
    quizArea.classList.add('hidden');

    await loadLeaderboard();
  }

  // ---------------- NAVIGATION ----------------
  function nextQuestion() {
    if (answers[currentIndex] === undefined) {
      showWarning("Please select an option first.");
      return;
    }

    if (currentIndex < questions.length - 1) {
      currentIndex++;
      renderQuestion();
    } else {
      submitQuiz();
    }
  }

  // ---------------- START QUIZ ----------------
  async function startQuiz() {
    await fetchQuestions();

    currentIndex = 0;

    nameEntry.classList.add('hidden');
    quizArea.classList.remove('hidden');
    resultArea.classList.add('hidden');

    renderQuestion();
    startTimer();
  }

  // ---------------- EVENTS ----------------
  studentForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    studentName = document.getElementById('studentName').value.trim();

    if (!studentName) {
      showWarning("Enter your name first");
      return;
    }

    await startQuiz();
  });

  nextBtn.addEventListener('click', nextQuestion);

  restartBtn.addEventListener('click', () => {
    location.reload();
  });

  // ---------------- INIT ----------------
  loadLeaderboard();

});
