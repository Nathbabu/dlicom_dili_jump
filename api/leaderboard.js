const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || 'https://positive-cub-88368.upstash.io';
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'gQAAAAAAAVkwAAIgcDE3ZWY3ZWM2YWVlYjE0NDNkYWQ1ZTRiZGQ5ZWRmZWY3OA';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const redisRes = await fetch(`${UPSTASH_REDIS_REST_URL}/get/dlicom_doodlejump_leaderboard`, {
      headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
    });

    if (redisRes.ok) {
      const data = await redisRes.json();
      let list = [];
      if (data.result) {
        list = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
        if (Array.isArray(list)) list.sort((a, b) => b.score - a.score);
      }
      return res.status(200).json({ success: true, count: list.length, leaderboard: list });
    }
  } catch (e) {
    console.warn('Leaderboard fetch error:', e.message);
  }

  return res.status(200).json({ success: true, count: 0, leaderboard: [] });
};
