const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || 'https://positive-cub-88368.upstash.io';
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'gQAAAAAAAVkwAAIgcDE3ZWY3ZWM2YWVlYjE0NDNkYWQ1ZTRiZGQ5ZWRmZWY3OA';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { pilot, score, altitude, suitColor, maxCombo, crystals } = req.body || {};
    if (!pilot || typeof score !== 'number' || score <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid score submission' });
    }

    const cleanPilot = String(pilot || ('Dili_' + Math.floor(Math.random() * 8999 + 1000))).trim().slice(0, 25);
    const entry = {
      pilot: cleanPilot,
      score: Math.floor(score),
      altitude: Math.floor(altitude || score),
      suitColor: suitColor || 'mint',
      maxCombo: maxCombo || 1,
      crystals: crystals || 0,
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

    // 2. Update existing or insert
    const idx = current.findIndex(e => e.pilot.toLowerCase() === cleanPilot.toLowerCase());
    if (idx !== -1) {
      if (entry.score > current[idx].score) {
        current[idx] = Object.assign({}, current[idx], entry);
      }
    } else {
      current.push(entry);
    }

    // 3. Sort & truncate
    current = current.sort((a, b) => b.score - a.score).slice(0, 100);

    // 4. Save to Upstash Redis
    await fetch(`${UPSTASH_REDIS_REST_URL}/set/dlicom_doodlejump_leaderboard`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(current)
    });

    const rank = current.findIndex(e => e.pilot.toLowerCase() === cleanPilot.toLowerCase()) + 1;

    return res.status(200).json({
      success: true,
      rank: rank > 0 ? rank : current.length,
      entry: entry,
      totalPilots: current.length
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};
