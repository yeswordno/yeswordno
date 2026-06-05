// GET /api/leaderboard?type=day|week&device=<deviceKey>
// İlk 20 + (varsa) istek sahibinin sırası.
import { redis, redisConfigured, istanbulDate, isoWeekKey } from './_store.js';

const TOP_N = 20;

export default async function handler(req, res) {
  if (!redisConfigured()) return res.status(503).json({ error: 'backend-yok' });

  const type = req.query.type === 'week' ? 'week' : 'day';
  const deviceKey = req.query.device || null;
  const date = istanbulDate();
  const key = type === 'week' ? `lb:week:${isoWeekKey(date)}` : `lb:day:${date}`;

  // İlk N (yüksekten düşüğe), skorlarıyla
  const flat = await redis('ZREVRANGE', key, 0, TOP_N - 1, 'WITHSCORES');
  const entries = [];
  for (let i = 0; i < (flat?.length || 0); i += 2) {
    entries.push({ deviceKey: flat[i], score: Math.round(Number(flat[i + 1])) });
  }

  // Nick + emoji bilgilerini topla
  const users = {};
  if (entries.length) {
    const raw = await redis('MGET', ...entries.map(e => `user:${e.deviceKey}`));
    entries.forEach((e, i) => { try { users[e.deviceKey] = JSON.parse(raw[i]); } catch { /* yoksay */ } });
  }

  const list = entries.map((e, i) => ({
    rank: i + 1,
    nick: users[e.deviceKey]?.nick || '???',
    emoji: users[e.deviceKey]?.emoji || '🎮',
    score: e.score,
    me: !!(deviceKey && e.deviceKey === deviceKey),
  }));

  // İlk 20 dışındaysa istek sahibinin kendi sırası
  let me = null;
  if (deviceKey && !list.some(r => r.me)) {
    const rankRaw = await redis('ZREVRANK', key, deviceKey);
    if (rankRaw != null) {
      const scoreRaw = await redis('ZSCORE', key, deviceKey);
      let u = {};
      try { u = JSON.parse(await redis('GET', `user:${deviceKey}`)); } catch { /* yoksay */ }
      me = { rank: Number(rankRaw) + 1, score: Math.round(Number(scoreRaw)), nick: u.nick, emoji: u.emoji };
    }
  }

  return res.status(200).json({ type, date, list, me });
}
