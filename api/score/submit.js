const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || 'https://positive-cub-88368.upstash.io';
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'gQAAAAAAAVkwAAIgcDE3ZWY3ZWM2YWVlYjE0NDNkYWQ1ZTRiZGQ5ZWRmZWY3OA';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { pilot, score, altitude, suitColor, maxCombo, crystals, difficulty } = req.body || {};
    if (!pilot || typeof score !== 'number' || score <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid score submission' });
    }

    const cleanPilot = String(pilot || ('Dili_' + Math.floor(Math.random() * 8999 + 1000))).trim().slice(0, 25);
    const cleanDiff = (difficulty && ['normal', 'medium', 'hard'].includes(String(difficulty).toLowerCase()))
      ? String(difficulty).toLowerCase()
      : 'normal';

    const entry = {
      pilot: cleanPilot,
      score: Math.floor(score),
      altitude: Math.floor(altitude || score),
      suitColor: suitColor || 'mint',
      maxCombo: maxCombo || 1,
      crystals: crystals || 0,
      difficulty: cleanDiff,
      timestamp: new Date().toISOString()
    };

    // 1. Get current leaderboard
    let current = [];
    try {
      const getRes = await fetch(`${UPSTASH_REDIS_REST_URL}/get/dlicom_doodlejump_leaderboard`, {
        headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
      });
      if (getRes.ok) {
        const data = await getRes.json();
        if (data.result) {
          const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
          if (Array.isArray(parsed)) current = parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading from redis:', e.message);
    }

    // 2. Update existing or insert (PER PILOT + PER DIFFICULTY!)
    const idx = current.findIndex(e =>
      e.pilot.toLowerCase() === cleanPilot.toLowerCase() &&
      (e.difficulty || 'normal').toLowerCase() === cleanDiff
    );

    if (idx !== -1) {
      if (entry.score > current[idx].score) {
        current[idx] = Object.assign({}, current[idx], entry);
      }
    } else {
      current.push(entry);
    }

    // 3. Sort & truncate (keep top 200 entries)
    current = current.sort((a, b) => b.score - a.score).slice(0, 200);

    // 4. Save to Upstash Redis
    await fetch(`${UPSTASH_REDIS_REST_URL}/set/dlicom_doodlejump_leaderboard`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(current)
    });

    // 5. Calculate rank specifically within this difficulty mode
    const modeEntries = current
      .filter(e => (e.difficulty || 'normal').toLowerCase() === cleanDiff)
      .sort((a, b) => b.score - a.score);

    const modeRank = modeEntries.findIndex(e => e.pilot.toLowerCase() === cleanPilot.toLowerCase()) + 1;

    return res.status(200).json({
      success: true,
      rank: modeRank > 0 ? modeRank : modeEntries.length,
      entry: entry,
      difficulty: cleanDiff,
      totalPilots: modeEntries.length
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};
