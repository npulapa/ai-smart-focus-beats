const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/environments.json');

function readEnvs() {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function writeEnvs(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

// GET /api/environments - all environments (with optional ?category= and ?q= filters)
router.get('/', (req, res) => {
  let envs = readEnvs();
  const { category, q } = req.query;
  if (category && category !== 'All') {
    envs = envs.filter(e => e.category.toLowerCase() === category.toLowerCase());
  }
  if (q) {
    const query = q.toLowerCase();
    envs = envs.filter(e =>
      e.name.toLowerCase().includes(query) ||
      e.description.toLowerCase().includes(query) ||
      e.tags.some(t => t.toLowerCase().includes(query)) ||
      e.category.toLowerCase().includes(query)
    );
  }
  res.json({ environments: envs });
});

// GET /api/environments/categories - list all unique categories
router.get('/categories', (req, res) => {
  const envs = readEnvs();
  const cats = ['All', ...new Set(envs.map(e => e.category))];
  res.json({ categories: cats });
});

// GET /api/environments/favorites
router.get('/favorites', (req, res) => {
  const envs = readEnvs().filter(e => e.isFavorite);
  res.json({ environments: envs });
});

// GET /api/environments/:id
router.get('/:id', (req, res) => {
  const envs = readEnvs();
  const env = envs.find(e => e.id === req.params.id);
  if (!env) return res.status(404).json({ error: 'Environment not found' });
  res.json({ environment: env });
});

// POST /api/environments/:id/favorite - toggle favorite
router.post('/:id/favorite', (req, res) => {
  const envs = readEnvs();
  const idx = envs.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Environment not found' });
  envs[idx].isFavorite = !envs[idx].isFavorite;
  writeEnvs(envs);
  res.json({ environment: envs[idx], isFavorite: envs[idx].isFavorite });
});

module.exports = router;
