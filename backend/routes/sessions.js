const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('crypto').randomUUID ? { v4: () => require('crypto').randomUUID() } : require('crypto');

const DATA_PATH = path.join(__dirname, '../data/sessions.json');

function readSessions() {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function writeSessions(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

// GET /api/sessions - all sessions (last 30 days)
router.get('/', (req, res) => {
  const sessions = readSessions();
  const sorted = sessions.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  res.json({ sessions: sorted.slice(0, 20) });
});

// GET /api/sessions/today
router.get('/today', (req, res) => {
  const sessions = readSessions();
  const today = getTodayDate();
  const todaySessions = sessions.filter(s => s.date === today && s.completed);
  const totalMinutes = todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const avgScore = todaySessions.length > 0
    ? Math.round(todaySessions.reduce((sum, s) => sum + (s.focusScore || 0), 0) / todaySessions.length)
    : 0;
  res.json({
    sessions: todaySessions,
    totalMinutes,
    sessionCount: todaySessions.length,
    avgFocusScore: avgScore
  });
});

// GET /api/sessions/streak
router.get('/streak', (req, res) => {
  const sessions = readSessions();
  const completedDates = [...new Set(sessions.filter(s => s.completed).map(s => s.date))].sort().reverse();

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (const dateStr of completedDates) {
    const sessionDate = new Date(dateStr);
    sessionDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((currentDate - sessionDate) / (1000 * 60 * 60 * 24));
    if (diffDays === streak) {
      streak++;
      currentDate = sessionDate;
    } else {
      break;
    }
  }

  // Weekly data (last 7 days)
  const weekly = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const daySessions = sessions.filter(s => s.date === dateStr && s.completed);
    const totalMins = daySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    weekly.push({
      date: dateStr,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
      fullLabel: d.toLocaleDateString('en-US', { weekday: 'short' }),
      minutes: totalMins,
      sessions: daySessions.length,
      avgScore: daySessions.length > 0
        ? Math.round(daySessions.reduce((sum, s) => sum + (s.focusScore || 0), 0) / daySessions.length)
        : 0
    });
  }

  res.json({ streak, weekly });
});

// POST /api/sessions - start a new session
router.post('/', (req, res) => {
  const { environment, category, duration } = req.body;
  const sessions = readSessions();
  const newSession = {
    id: `session_${Date.now()}`,
    userId: 'user_001',
    startTime: new Date().toISOString(),
    endTime: null,
    duration: duration || 25,
    environment: environment || 'Deep Forest Rain',
    category: category || 'Nature',
    completed: false,
    focusScore: 0,
    date: getTodayDate()
  };
  sessions.push(newSession);
  writeSessions(sessions);
  res.status(201).json({ session: newSession });
});

// PUT /api/sessions/:id - complete or update a session
router.put('/:id', (req, res) => {
  const sessions = readSessions();
  const idx = sessions.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Session not found' });

  const { completed, focusScore, duration } = req.body;
  sessions[idx] = {
    ...sessions[idx],
    ...(completed !== undefined && { completed }),
    ...(focusScore !== undefined && { focusScore }),
    ...(duration !== undefined && { duration }),
    endTime: completed ? new Date().toISOString() : sessions[idx].endTime
  };

  writeSessions(sessions);
  res.json({ session: sessions[idx] });
});

// DELETE /api/sessions/:id
router.delete('/:id', (req, res) => {
  const sessions = readSessions();
  const filtered = sessions.filter(s => s.id !== req.params.id);
  if (filtered.length === sessions.length) return res.status(404).json({ error: 'Session not found' });
  writeSessions(filtered);
  res.json({ message: 'Session deleted' });
});

module.exports = router;
