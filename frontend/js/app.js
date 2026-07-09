/* ============================================================
   app.js — SPA Router + Global State + Settings
   ============================================================ */

const API = ''; // same-origin relative paths

// ---- Global App State ----
window.AppState = {
  currentPage: 'dashboard',
  user: { name: 'Alex', settings: { focusDuration: 25 } },
  currentSession: null,
  currentEnvironment: null,
  peakChart: null
};

// ---- Toast ----
window.showToast = function(msg, duration = 2800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
};

// ---- Page Router ----
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  const navEl  = document.getElementById(`nav-${page}`);
  if (pageEl) pageEl.classList.add('active');
  if (navEl)  navEl.classList.add('active');

  AppState.currentPage = page;

  // Trigger page-specific load
  if (page === 'dashboard') loadDashboard();
  if (page === 'explore')   loadExplore();
  if (page === 'insights')  loadInsights();
}

// ---- Bottom Nav ----
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.getAttribute('data-page');
    navigateTo(page);
  });
});

// ---- Start Focus Button (from Dashboard) ----
document.getElementById('start-focus-btn').addEventListener('click', () => {
  navigateTo('session');
  startSession();
});

// ---- Settings Panel ----
const settingsOverlay = document.getElementById('settings-overlay');
const settingsBtn     = document.getElementById('settings-btn');
const settingsClose   = document.getElementById('settings-close-btn');

settingsBtn.addEventListener('click', () => {
  settingsOverlay.classList.add('open');
  loadSettings();
});
settingsClose.addEventListener('click', () => settingsOverlay.classList.remove('open'));
settingsOverlay.addEventListener('click', (e) => {
  if (e.target === settingsOverlay) settingsOverlay.classList.remove('open');
});

// ---- Settings: Duration Chips ----
document.querySelectorAll('[data-dur]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-dur]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

function loadSettings() {
  const nameEl = document.getElementById('settings-name');
  nameEl.value = AppState.user.name;

  const dur = AppState.user.settings.focusDuration;
  document.querySelectorAll('[data-dur]').forEach(b => {
    b.classList.toggle('active', parseInt(b.getAttribute('data-dur')) === dur);
  });
}

document.getElementById('settings-save-btn').addEventListener('click', async () => {
  const name = document.getElementById('settings-name').value.trim() || 'Alex';
  const activeDurBtn = document.querySelector('[data-dur].active');
  const focusDuration = activeDurBtn ? parseInt(activeDurBtn.getAttribute('data-dur')) : 25;

  try {
    const res = await fetch('/api/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, settings: { focusDuration } })
    });
    const data = await res.json();
    AppState.user = data.user;
    // Update greeting
    updateGreeting(name);
    settingsOverlay.classList.remove('open');
    showToast('✓ Settings saved');
  } catch (err) {
    showToast('⚠ Failed to save settings');
  }
});

// ---- Greeting Logic ----
window.updateGreeting = function(name) {
  const hour = new Date().getHours();
  let greeting = 'Good Morning';
  if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
  else if (hour >= 17) greeting = 'Good Evening';

  const subs = [
    'Your cognitive rhythm is at its peak. Ready for a deep work session?',
    'The best time to focus is now. Let\'s build momentum.',
    'Every session brings you closer to mastery. Start your flow.',
    'Quiet the noise. Enter the flow state.'
  ];
  const sub = subs[Math.floor(Math.random() * subs.length)];

  const greetEl = document.getElementById('greeting-text');
  const subEl   = document.getElementById('greeting-sub');
  if (greetEl) greetEl.textContent = `${greeting}, ${name}`;
  if (subEl)   subEl.textContent = sub;
};

// ---- Load User on Start ----
async function initApp() {
  try {
    const res  = await fetch('/api/user');
    const data = await res.json();
    AppState.user = data.user;
    updateGreeting(data.user.name);
  } catch {
    updateGreeting('Alex');
  }
  // Initial page load
  loadDashboard();
}

initApp();
