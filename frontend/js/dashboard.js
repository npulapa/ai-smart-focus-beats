/* ============================================================
   dashboard.js — Dashboard page logic
   ============================================================ */

window.loadDashboard = async function () {
  await Promise.all([loadTodayStats(), loadStreakData(), loadRecentSessions()]);
};

// ---- Today's Stats ----
async function loadTodayStats() {
  try {
    const res  = await fetch('/api/sessions/today');
    const data = await res.json();
    document.getElementById('today-minutes').textContent = data.totalMinutes;
    document.getElementById('today-sessions').textContent = data.sessionCount;

    const scoreEl  = document.getElementById('focus-score-val');
    const scoreSubEl = document.getElementById('focus-score-sub');
    if (data.avgFocusScore > 0) {
      scoreEl.textContent = data.avgFocusScore;
      const diff = data.avgFocusScore - 75; // baseline
      scoreSubEl.textContent = diff >= 0
        ? `${diff}% above your average`
        : `${Math.abs(diff)}% below your average`;
    } else {
      scoreEl.textContent = '—';
      scoreSubEl.textContent = 'No sessions today yet';
    }
  } catch {
    document.getElementById('today-minutes').textContent = '0';
    document.getElementById('today-sessions').textContent = '0';
  }
}

// ---- Streak + Weekly Chart ----
async function loadStreakData() {
  try {
    const res  = await fetch('/api/sessions/streak');
    const data = await res.json();

    // Streak label
    const streakEl = document.getElementById('streak-count');
    streakEl.textContent = `${data.streak} Day Streak`;

    renderWeeklyChart(data.weekly);
  } catch {
    renderWeeklyChart([]);
  }
}

function renderWeeklyChart(weekly) {
  const chartEl  = document.getElementById('weekly-chart');
  const labelsEl = document.getElementById('weekly-labels');
  if (!chartEl || !labelsEl) return;

  const maxMins = Math.max(...weekly.map(d => d.minutes), 1);

  chartEl.innerHTML = weekly.map(day => {
    const pct = Math.max((day.minutes / maxMins) * 100, day.sessions > 0 ? 12 : 0);
    const isToday = day.date === new Date().toISOString().split('T')[0];
    const color = day.sessions > 0 ? 'rgba(78,222,163,0.7)' : 'rgba(255,255,255,0.05)';
    const border = isToday ? '2px solid #4edea3' : 'none';

    return `<div style="flex:1; display:flex; align-items:flex-end; height:100%;">
      <div title="${day.minutes} min, ${day.sessions} session(s)"
           style="width:100%; height:${pct}%; min-height:${day.sessions > 0 ? '10' : '4'}px;
                  background:${color}; border-radius:6px 6px 0 0;
                  border:${border}; transition:height 0.6s ease; position:relative;">
      </div>
    </div>`;
  }).join('');

  labelsEl.innerHTML = weekly.map(day => {
    const isToday = day.date === new Date().toISOString().split('T')[0];
    return `<span class="text-label" style="flex:1; text-align:center; color:${isToday ? 'var(--color-tertiary)' : 'var(--color-on-surface-variant)'}; font-size:11px;">${day.label}</span>`;
  }).join('');
}

// ---- Recent Sessions ----
async function loadRecentSessions() {
  const listEl = document.getElementById('recent-sessions-list');
  try {
    const res  = await fetch('/api/sessions');
    const data = await res.json();
    const sessions = data.sessions.filter(s => s.completed).slice(0, 5);

    if (sessions.length === 0) {
      listEl.innerHTML = `<div style="text-align:center; padding:32px; color:var(--color-on-surface-variant);">
        <span class="material-symbols-outlined" style="font-size:40px; display:block; margin-bottom:8px; opacity:0.4;">history</span>
        <p class="text-label">No sessions yet. Start your first focus session!</p>
      </div>`;
      return;
    }

    listEl.innerHTML = sessions.map(s => {
      const date   = new Date(s.startTime);
      const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const scoreColor = s.focusScore >= 85 ? 'var(--color-tertiary)' : s.focusScore >= 70 ? 'var(--color-primary)' : 'var(--color-secondary)';

      return `<div class="glass-card animate-fade-in" style="padding:16px 20px; border-radius:16px; display:flex; align-items:center; gap:14px;">
        <div style="width:42px; height:42px; border-radius:12px; background:rgba(78,222,163,0.1); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
          <span class="material-symbols-outlined text-tertiary" style="font-size:20px;">music_note</span>
        </div>
        <div style="flex:1; min-width:0;">
          <p style="font-weight:500; color:var(--color-on-surface); font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${s.environment}</p>
          <p class="text-label text-muted" style="margin-top:2px;">${dateStr} · ${timeStr} · ${s.duration} min</p>
        </div>
        <div style="display:flex; align-items:center; gap:4px; flex-shrink:0;">
          <span style="font-family:var(--font-mono); font-size:15px; font-weight:600; color:${scoreColor};">${s.focusScore}%</span>
        </div>
      </div>`;
    }).join('');
  } catch {
    listEl.innerHTML = `<p class="text-muted text-label" style="text-align:center; padding:24px;">Could not load sessions.</p>`;
  }
}
