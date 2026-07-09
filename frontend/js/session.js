/* ============================================================
   session.js — Active Session: Pomodoro timer, controls, logging
   ============================================================ */

let timerInterval = null;
let totalSeconds  = 25 * 60;
let remainSeconds = 25 * 60;
let isRunning     = false;
let isPaused      = false;
let sessionId     = null;
let sessionEnv    = null;

const CIRCUMFERENCE = 2 * Math.PI * 128; // r=128 from SVG

// ---- Waveform Init ----
function initWaveform() {
  const container = document.getElementById('waveform-bars');
  if (!container) return;
  const heights = [20, 32, 44, 56, 64, 72, 64, 56, 64, 72, 64, 56, 44, 32, 44, 56, 32, 20];
  container.innerHTML = heights.map((h, i) => {
    const delay = (i * 0.08).toFixed(2);
    const dur   = (0.7 + Math.random() * 0.8).toFixed(2);
    return `<div class="waveform-bar"
      style="height:${h}px; animation-duration:${dur}s; animation-delay:${delay}s; opacity:${0.4 + (h / 72) * 0.6};">
    </div>`;
  }).join('');
}

// ---- Timer Ring Update ----
function updateRing() {
  const ring = document.getElementById('timer-ring');
  if (!ring) return;
  const progress = remainSeconds / totalSeconds;
  const offset   = CIRCUMFERENCE * (1 - progress);
  ring.style.strokeDasharray  = CIRCUMFERENCE;
  ring.style.strokeDashoffset = offset;
}

// ---- Display Update ----
function updateDisplay() {
  const m = Math.floor(remainSeconds / 60).toString().padStart(2, '0');
  const s = (remainSeconds % 60).toString().padStart(2, '0');
  const el = document.getElementById('countdown-display');
  if (el) el.textContent = `${m}:${s}`;
  updateRing();
}

// ---- Start Session ----
window.startSession = async function (envOverride) {
  const env = envOverride || AppState.currentEnvironment || {
    id: 'env_001', name: 'Deep Forest Rain', category: 'Nature',
    icon: 'forest', focusScore: 88
  };
  sessionEnv = env;
  AppState.currentEnvironment = env;

  const dur = AppState.user?.settings?.focusDuration || 25;
  totalSeconds  = dur * 60;
  remainSeconds = dur * 60;
  isRunning = true;
  isPaused  = false;

  // Update UI
  updateEnvUI(env);
  updateDisplay();
  updateToggleBtn();
  initWaveform();

  // Create session record in backend
  try {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        environment: env.name,
        category: env.category,
        duration: dur
      })
    });
    const data = await res.json();
    sessionId = data.session.id;
    AppState.currentSession = data.session;
  } catch {
    sessionId = `local_${Date.now()}`;
  }

  // Start countdown
  clearInterval(timerInterval);
  timerInterval = setInterval(tick, 1000);
};

function tick() {
  if (!isRunning || isPaused) return;
  remainSeconds--;
  updateDisplay();

  if (remainSeconds <= 0) {
    clearInterval(timerInterval);
    completeSession();
  }
}

// ---- Toggle Play/Pause ----
document.getElementById('session-toggle-btn').addEventListener('click', () => {
  if (!isRunning) {
    startSession(sessionEnv);
    return;
  }
  isPaused = !isPaused;
  updateToggleBtn();

  // Waveform pause visual
  const bars = document.querySelectorAll('.waveform-bar');
  bars.forEach(b => {
    b.style.animationPlayState = isPaused ? 'paused' : 'running';
  });
});

function updateToggleBtn() {
  const btn  = document.getElementById('session-toggle-btn');
  const icon = btn.querySelector('.material-symbols-outlined');
  icon.textContent = isPaused ? 'play_arrow' : 'pause';
}

// ---- Stop Session ----
document.getElementById('session-stop-btn').addEventListener('click', async () => {
  if (!isRunning) return;
  clearInterval(timerInterval);
  isRunning = false;
  isPaused  = false;

  const elapsed = totalSeconds - remainSeconds;
  const durationCompleted = Math.round(elapsed / 60);

  if (sessionId && durationCompleted > 0) {
    const score = calculateFocusScore(elapsed, totalSeconds);
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true, focusScore: score, duration: durationCompleted })
      });
    } catch {}
  }
  showToast('Session ended early. Progress saved.');
  navigateTo('dashboard');
});

// ---- Skip (reset timer) ----
document.getElementById('session-skip-btn').addEventListener('click', () => {
  clearInterval(timerInterval);
  remainSeconds = totalSeconds;
  updateDisplay();
  showToast('Timer reset');
});

// ---- Complete Session ----
async function completeSession() {
  isRunning = false;
  const score = calculateFocusScore(totalSeconds, totalSeconds);

  if (sessionId) {
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true, focusScore: score })
      });
    } catch {}
  }

  // Show modal
  const dur = Math.round(totalSeconds / 60);
  document.getElementById('modal-session-desc').textContent =
    `${dur} minute ${sessionEnv?.name || 'focus'} session logged.`;
  document.getElementById('modal-score-text').textContent = `Focus Score: ${score}%`;

  document.getElementById('session-complete-modal').classList.add('open');
}

// ---- Focus Score Calculation ----
function calculateFocusScore(elapsed, total) {
  const completionRatio = Math.min(elapsed / total, 1);
  const base = 65 + Math.round(completionRatio * 25);
  const bonus = Math.floor(Math.random() * 10); // slight variance
  return Math.min(base + bonus, 99);
}

// ---- Modal Buttons ----
document.getElementById('modal-close-btn').addEventListener('click', () => {
  document.getElementById('session-complete-modal').classList.remove('open');
  navigateTo('dashboard');
});

document.getElementById('modal-again-btn').addEventListener('click', () => {
  document.getElementById('session-complete-modal').classList.remove('open');
  startSession(sessionEnv);
});

// ---- Environment UI Update ----
function updateEnvUI(env) {
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('active-env-name', env.name);
  setEl('active-env-full-name', env.name);
  setEl('active-env-category', env.category);
  setEl('active-env-icon', env.icon || 'music_note');
  setEl('active-env-score', `${env.focusScore || '—'}%`);
  setEl('session-mode-label', 'Deep Work');
}

// ---- Change Environment Button ----
document.getElementById('change-env-btn').addEventListener('click', () => {
  navigateTo('explore');
});

// Initialize waveform on first load
initWaveform();
