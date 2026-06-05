// POST /api/submit  { deviceKey, level, score }
// Bir seviyenin düello skorunu işler.
//   Günlük puan = o gün OYNANAN seviyelerin ORTALAMASI.
//   Haftalık puan = o haftaki günlük puanların TOPLAMI (delta ile güncellenir).
import { redis, parseHash, redisConfigured, istanbulDate, isoWeekKey, LEVELS, DAY_TTL, WEEK_TTL } from './_store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!redisConfigured()) return res.status(503).json({ error: 'backend-yok' });

  const { deviceKey, level, score } = req.body || {};
  if (!deviceKey || !LEVELS.includes(level) || typeof score !== 'number') {
    return res.status(400).json({ error: 'eksik' });
  }

  const userRaw = await redis('GET', `user:${deviceKey}`);
  if (!userRaw) return res.status(403).json({ error: 'kayitsiz' });

  const date = istanbulDate();
  const week = isoWeekKey(date);
  const dayHash = `day:${date}:${deviceKey}`;
  const sc = Math.max(0, Math.round(score));

  // Aynı gün aynı seviye tekrar gelirse EN İYİ skoru tut
  const existing = await redis('HGET', dayHash, level);
  const best = existing != null ? Math.max(Number(existing), sc) : sc;
  await redis('HSET', dayHash, level, best);
  await redis('EXPIRE', dayHash, DAY_TTL);

  // Günlük ortalama (yalnız oynanan seviyeler)
  const vals = parseHash(await redis('HGETALL', dayHash));
  const played = LEVELS.filter(l => vals[l] != null).map(l => Number(vals[l]));
  const daily = Math.round(played.reduce((a, b) => a + b, 0) / played.length);

  // Haftalık = günlük ortalamaların toplamı → bugünün ortalaması değiştiyse delta uygula
  const oldRaw = await redis('ZSCORE', `lb:day:${date}`, deviceKey);
  const oldDaily = oldRaw != null ? Number(oldRaw) : 0;
  const delta = daily - oldDaily;

  await redis('ZADD', `lb:day:${date}`, daily, deviceKey);
  await redis('EXPIRE', `lb:day:${date}`, DAY_TTL);
  if (delta !== 0) {
    await redis('ZINCRBY', `lb:week:${week}`, delta, deviceKey);
    await redis('EXPIRE', `lb:week:${week}`, WEEK_TTL);
  }

  const weeklyRaw = await redis('ZSCORE', `lb:week:${week}`, deviceKey);
  const weekly = weeklyRaw != null ? Math.round(Number(weeklyRaw)) : daily;

  return res.status(200).json({ ok: true, date, level, levelScore: best, daily, weekly });
}
