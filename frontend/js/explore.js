/* ============================================================
   explore.js — Explore Environments page
   ============================================================ */

let allEnvironments = [];
let activeCategory  = 'All';

window.loadExplore = async function () {
  await Promise.all([loadCategories(), loadEnvironments()]);
  setupSearch();
};

// ---- Load Categories ----
async function loadCategories() {
  try {
    const res  = await fetch('/api/environments/categories');
    const data = await res.json();
    renderCategoryChips(data.categories);
  } catch {
    renderCategoryChips(['All', 'Nature', 'Lo-fi', 'Classical', 'Ambient', 'Binaural', 'Programming', 'Reading']);
  }
}

function renderCategoryChips(categories) {
  const container = document.getElementById('category-chips');
  if (!container) return;

  container.innerHTML = categories.map(cat => {
    const isActive = cat === activeCategory;
    return `<button class="chip ${isActive ? 'active' : ''}" data-cat="${cat}">${cat}</button>`;
  }).join('');

  container.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.getAttribute('data-cat');
      container.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterEnvironments();
    });
  });
}

// ---- Load Environments ----
async function loadEnvironments() {
  const grid = document.getElementById('environments-grid');
  try {
    const res  = await fetch('/api/environments');
    const data = await res.json();
    allEnvironments = data.environments;
    renderEnvironments(allEnvironments);
  } catch {
    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:48px; color:var(--color-on-surface-variant);">
      <span class="material-symbols-outlined" style="font-size:40px; display:block; margin-bottom:8px; opacity:0.4;">wifi_off</span>
      <p class="text-label">Could not load environments. Is the server running?</p>
    </div>`;
  }
}

// ---- Filter ----
function filterEnvironments() {
  const query = (document.getElementById('env-search')?.value || '').toLowerCase();
  let filtered = allEnvironments;

  if (activeCategory !== 'All') {
    filtered = filtered.filter(e => e.category === activeCategory);
  }
  if (query) {
    filtered = filtered.filter(e =>
      e.name.toLowerCase().includes(query) ||
      e.description.toLowerCase().includes(query) ||
      e.category.toLowerCase().includes(query) ||
      e.tags.some(t => t.includes(query))
    );
  }
  renderEnvironments(filtered);
}

// ---- Render Cards ----
function renderEnvironments(envs) {
  const grid = document.getElementById('environments-grid');
  if (!grid) return;

  if (envs.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:48px; color:var(--color-on-surface-variant);">
      <span class="material-symbols-outlined" style="font-size:40px; display:block; margin-bottom:8px; opacity:0.4;">search_off</span>
      <p class="text-label">No environments match your search.</p>
    </div>`;
    return;
  }

  grid.innerHTML = envs.map(env => {
    const heartIcon = env.isFavorite ? 'favorite' : 'favorite_border';
    const heartColor = env.isFavorite ? 'var(--color-error)' : 'var(--color-on-surface-variant)';
    const bpmTag = env.bpm > 0 ? `<span class="text-label" style="color:var(--color-on-surface-variant); font-size:10px;">${env.bpm} BPM</span>` : '';
    const scoreColor = env.focusScore >= 88 ? 'var(--color-tertiary)' : 'var(--color-primary)';

    return `<div class="glass-card animate-fade-in env-card"
        data-id="${env.id}"
        style="padding:18px 16px; display:flex; flex-direction:column; gap:10px; cursor:pointer; position:relative;
               border-radius:20px; transition:transform 0.2s, background 0.2s;">
      <!-- Fav Button -->
      <button class="fav-btn" data-id="${env.id}"
        style="position:absolute; top:12px; right:12px; background:none; border:none; cursor:pointer; padding:4px; z-index:2;"
        title="Toggle Favorite" aria-label="Favorite">
        <span class="material-symbols-outlined" style="font-size:18px; color:${heartColor}; font-variation-settings:'FILL' ${env.isFavorite ? 1 : 0};">${heartIcon}</span>
      </button>

      <!-- Icon -->
      <div style="width:44px; height:44px; border-radius:14px; background:rgba(78,222,163,0.1); display:flex; align-items:center; justify-content:center;">
        <span class="material-symbols-outlined" style="font-size:22px; color:${env.color || 'var(--color-tertiary)'};">${env.icon || 'music_note'}</span>
      </div>

      <!-- Info -->
      <div style="flex:1;">
        <p style="font-weight:600; font-size:13px; color:var(--color-on-surface); margin-bottom:4px; line-height:1.3;">${env.name}</p>
        <p style="font-size:11px; color:var(--color-on-surface-variant); line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${env.description}</p>
      </div>

      <!-- Meta Row -->
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <span class="chip" style="font-size:9px; padding:3px 8px; border-radius:9999px;">${env.category}</span>
        <span style="font-family:var(--font-mono); font-size:12px; font-weight:600; color:${scoreColor};">${env.focusScore}%</span>
      </div>

      <!-- Play Button -->
      <button class="btn-primary play-env-btn" data-id="${env.id}"
        style="width:100%; justify-content:center; padding:10px; font-size:13px; margin-top:2px;">
        <span class="material-symbols-outlined" style="font-size:18px; font-variation-settings:'FILL' 1;">play_arrow</span>
        Start Focus
      </button>
    </div>`;
  }).join('');

  // Card hover effect
  grid.querySelectorAll('.env-card').forEach(card => {
    card.addEventListener('mouseenter', () => card.style.transform = 'translateY(-2px)');
    card.addEventListener('mouseleave', () => card.style.transform = '');
  });

  // Favorite toggle
  grid.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      try {
        const res  = await fetch(`/api/environments/${id}/favorite`, { method: 'POST' });
        const data = await res.json();
        // Update local state
        const env = allEnvironments.find(e => e.id === id);
        if (env) env.isFavorite = data.isFavorite;
        // Update icon
        const icon = btn.querySelector('.material-symbols-outlined');
        icon.textContent = data.isFavorite ? 'favorite' : 'favorite_border';
        icon.style.color = data.isFavorite ? 'var(--color-error)' : 'var(--color-on-surface-variant)';
        icon.style.fontVariationSettings = `'FILL' ${data.isFavorite ? 1 : 0}`;
        showToast(data.isFavorite ? '♥ Added to favorites' : '♡ Removed from favorites');
      } catch {
        showToast('⚠ Could not update favorite');
      }
    });
  });

  // Play button
  grid.querySelectorAll('.play-env-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id  = btn.getAttribute('data-id');
      const env = allEnvironments.find(e => e.id === id);
      if (env) {
        AppState.currentEnvironment = env;
        navigateTo('session');
        startSession(env);
      }
    });
  });
}

// ---- Search ----
function setupSearch() {
  const searchEl = document.getElementById('env-search');
  if (!searchEl) return;
  let debounceTimer;
  searchEl.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(filterEnvironments, 250);
  });
}
