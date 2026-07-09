const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/user.json');

function readUser() {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

function writeUser(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

// GET /api/user
router.get('/', (req, res) => {
  const user = readUser();
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// PUT /api/user - update profile/settings
router.put('/', (req, res) => {
  const user = readUser();
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { name, settings } = req.body;
  if (name) user.name = name;
  if (settings) user.settings = { ...user.settings, ...settings };
  writeUser(user);
  res.json({ user });
});

module.exports = router;
