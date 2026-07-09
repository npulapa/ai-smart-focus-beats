/* ============================================================
   insights.js — AI Insights page: charts and analytics
   ============================================================ */

window.loadInsights = async function () {
  await Promise.all([loadWeeklyInsights(), loadGenreScores(), loadPeakHours()]);
};

// ---- Weekly Summary + Stats ----
async function loadWeeklyInsights() {
  try {
    const [weeklyRes, summaryRes] = await Promise.all([
      fetch('/api/insights/weekly'),
      fetch('/api/insights/summary')
    ]);
    const weekly  = await weeklyRes.json();
    const summary = await summaryRes.json();

    // Score
    const scoreEl  = document.getElementById('weekly-score-val');
    const changeEl = document.getElementById('weekly-score-change');
    if (scoreEl) scoreEl.textContent = weekly.weeklyScore || '—';
    if (changeEl) {
      const sign = weekly.scoreChange >= 0 ? '+' : '';
      changeEl.textContent = `${sign}${weekly.scoreChange}% vs last week`;
      changeEl.style.color = weekly.improvement ? 'var(--color-tertiary)' : 'var(--color-error)';
    }

    // Stats row
    const setStat = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setStat('stat-sessions', weekly.totalSessions);
    setStat('stat-hours',    weekly.totalHours + 'h');
    setStat('stat-best-time', summary.bestTime || 'AM');

    // AI Summary text — use textContent first, then safely highlight patterns
    const summaryEl = document.getElementById('ai-summary-text');
    if (summaryEl && summary.summary) {
      // Escape raw text first, then apply safe span replacements
      const escaped = summary.summary
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      summaryEl.innerHTML = escaped
        .replace(/(\d+%)/g, '<span class="highlight-mint">$1</span>')
        .replace(/&quot;([^&]+)&quot;/g, '<em class="highlight-surface">&quot;$1&quot;</em>')
        .replace(/"([^"]+)"/g, '<em class="highlight-surface">"$1"</em>');
    }
  } catch (err) {
    const el = document.getElementById('ai-summary-text');
    if (el) el.textContent = 'Could not load AI insights. Please ensure the server is running.';
  }
}

// ---- Genre Focus Scores ----
async function loadGenreScores() {
  const container = document.getElementById('genre-bars');
  if (!container) return;
  try {
    const res   = await fetch('/api/insights/genre-scores');
    const data  = await res.json();
    const genres = data.genres.slice(0, 7);
    const max   = Math.max(...genres.map(g => g.avgScore), 1);

    container.innerHTML = genres.map((g, i) => {
      const colors = [
        'var(--color-tertiary)',
        'var(--color-primary)',
        'var(--color-secondary)',
        'rgba(78,222,163,0.7)',
        'rgba(192,193,255,0.7)',
        'rgba(196,193,251,0.7)',
        'var(--color-error)'
      ];
      const color = colors[i % colors.length];
      const pct   = ((g.avgScore / 100) * 100).toFixed(0);

      return `<div style="display:flex; flex-direction:column; gap:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="text-label" style="color:var(--color-on-surface); font-size:12px;">${g.category}</span>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="text-label" style="color:var(--color-on-surface-variant); font-size:10px;">${g.sessions} sessions</span>
            <span class="text-label" style="color:${color}; font-weight:700;">${g.avgScore}%</span>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-bar-fill" style="width:${pct}%; background:${color};" data-target="${pct}"></div>
        </div>
      </div>`;
    }).join('');

    // Animate in
    setTimeout(() => {
      container.querySelectorAll('.progress-bar-fill').forEach(bar => {
        bar.style.width = bar.getAttribute('data-target') + '%';
      });
    }, 100);

  } catch {
    container.innerHTML = `<p class="text-label text-muted">Could not load genre data.</p>`;
  }
}

// ---- Peak Hours Chart (Chart.js) ----
async function loadPeakHours() {
  const canvas = document.getElementById('peak-hours-chart');
  if (!canvas) return;

  try {
    const res  = await fetch('/api/insights/peak-hours');
    const data = await res.json();

    // Show every 3rd hour label
    const labels = data.hours.map((h, i) => i % 3 === 0 ? h.label : '');
    const scores = data.hours.map(h => h.avgScore);

    // Destroy previous chart
    if (AppState.peakChart) {
      AppState.peakChart.destroy();
    }

    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, 'rgba(78,222,163,0.35)');
    gradient.addColorStop(1, 'rgba(78,222,163,0.01)');

    AppState.peakChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: scores,
          fill: true,
          backgroundColor: gradient,
          borderColor: '#4edea3',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: '#4edea3',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(29, 32, 34, 0.95)',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            titleColor: '#c7c4d7',
            bodyColor: '#4edea3',
            callbacks: {
              title: (items) => data.hours[items[0].dataIndex]?.label || '',
              label: (item) => `Focus: ${item.raw}%`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: {
              color: 'rgba(199,196,215,0.6)',
              font: { family: "'JetBrains Mono', monospace", size: 10 }
            }
          },
          y: {
            min: 0,
            max: 100,
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: {
              color: 'rgba(199,196,215,0.6)',
              font: { family: "'JetBrains Mono', monospace", size: 10 },
              callback: v => `${v}%`,
              stepSize: 25
            }
          }
        }
      }
    });
  } catch (err) {
    canvas.parentElement.innerHTML = `<p class="text-label text-muted" style="padding:24px; text-align:center;">Could not render peak hours chart.</p>`;
  }
}
