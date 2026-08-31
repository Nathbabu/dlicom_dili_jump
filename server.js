const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || 'https://positive-cub-88368.upstash.io';
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'gQAAAAAAAVkwAAIgcDE3ZWY3ZWM2YWVlYjE0NDNkYWQ1ZTRiZGQ5ZWRmZWY3OA';

app.use(cors());
app.use(express.json());

// Explicit Static Asset Handlers
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(express.static(path.join(__dirname)));

// In-memory fallback cache
let leaderboardCache = [];

async function getLeaderboardFromRedis() {
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) return leaderboardCache;
  try {
    const res = await fetch(`${UPSTASH_REDIS_REST_URL}/get/dlicom_doodlejump_leaderboard`, {
      headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.result) {
        const arr = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
        if (Array.isArray(arr)) {
          leaderboardCache = arr.sort((a, b) => b.score - a.score);
          return leaderboardCache;
        }
      }
    }
  } catch (e) {
    console.warn('[Leaderboard] Error reading Redis:', e.message);
  }
  return leaderboardCache;
}

async function saveScoreToRedis(newEntry) {
  let current = await getLeaderboardFromRedis();
  
  // Update or insert
  const existingIdx = current.findIndex(e => e.pilot.toLowerCase() === newEntry.pilot.toLowerCase());
  if (existingIdx !== -1) {
    if (newEntry.score > current[existingIdx].score) {
      current[existingIdx] = Object.assign({}, current[existingIdx], newEntry);
    }
  } else {
    current.push(newEntry);
  }

  // Sort & keep Top 100
  current = current.sort((a, b) => b.score - a.score).slice(0, 100);
  leaderboardCache = current;

  if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
    try {
      await fetch(`${UPSTASH_REDIS_REST_URL}/set/dlicom_doodlejump_leaderboard`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(current)
      });
    } catch (e) {
      console.warn('[Leaderboard] Error saving to Redis:', e.message);
    }
  }
  return current;
}

// API: Get Global Leaderboard
app.get('/api/leaderboard', async (req, res) => {
  const list = await getLeaderboardFromRedis();
  res.json({ success: true, count: list.length, leaderboard: list });
});

// API: Submit High Score
app.post('/api/score/submit', async (req, res) => {
  try {
    const { pilot, score, altitude, suitColor, maxCombo, crystals } = req.body;
    if (!pilot || typeof score !== 'number' || score <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid score submission' });
    }

    const cleanPilot = String(pilot || 'Dili_' + Math.floor(Math.random() * 8999 + 1000)).trim().slice(0, 25);
    const entry = {
      pilot: cleanPilot,
      score: Math.floor(score),
      altitude: Math.floor(altitude || score),
      suitColor: suitColor || 'mint',
      maxCombo: maxCombo || 1,
      crystals: crystals || 0,
      timestamp: new Date().toISOString()
    };

    const updated = await saveScoreToRedis(entry);
    const rank = updated.findIndex(e => e.pilot.toLowerCase() === cleanPilot.toLowerCase()) + 1;

    res.json({
      success: true,
      rank: rank > 0 ? rank : updated.length,
      entry: entry,
      totalPilots: updated.length
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Serve Main Game Page for all other HTML navigations
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Fallback only if no static file matched and not an API call
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.includes('.')) {
    return res.sendFile(path.join(__dirname, 'index.html'));
  }
  next();
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 [DILI JUMP ARCADE SERVER] Running at http://localhost:${PORT}`);
    getLeaderboardFromRedis();
  });
}

module.exports = app;
