// POST /api/submit  { deviceKey, game, level, score }
//   game: 'duello' (level: easy|medium|hard) | 'pense' (level: a1_a2|b1_b2|c1_c2|academic)
//   score: 0–100 (her iki oyun da aynı ölçek).
// Hesap:
//   Her oyunun günlük puanı = o gün OYNANAN alt-skorlarının (kategori/seviye) ORTALAMASI (her birinin EN İYİSİ).
//   Genel günlük = OYNANAN oyunların ortalaması → (duelloDaily + penseDaily) / oynanan_oyun_sayısı.
//   Haftalık = genel günlüklerin TOPLAMI (delta ile).
import { redis, parseHash, redisConfigured, istanbulDate, isoWeekKey, LEVELS, PENSE_LEVELS, GAMES, DAY_TTL, WEEK_TTL } from './_store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!redisConfigured()) return res.status(503).json({ error: 'backend-yok' });

  let { deviceKey, game, level, score } = req.body || {};
  // Geri uyum: eski istemci game göndermezse seviyeden çıkar
  if (!game) game = LEVELS.includes(level) ? 'duello' : (PENSE_LEVELS.includes(level) ? 'pense' : null);

  if (!deviceKey || !game || !GAMES[game] || !GAMES[game].includes(level) || typeof score !== 'number') {
    return res.status(400).json({ error: 'eksik' });
  }

  const userRaw = await redis('GET', `user:${deviceKey}`);
  if (!userRaw) return res.status(403).json({ error: 'kayitsiz' });

  const date = istanbulDate();
  const week = isoWeekKey(date);
  const dayHash = `day:${date}:${deviceKey}`;
  const field = `${game}:${level}`;
  const sc = Math.max(0, Math.min(100, Math.round(score)));

  // Aynı gün aynı alt-oyun tekrar gelirse EN İYİ skoru tut
  const existing = await redis('HGET', dayHash, field);
  const best = existing != null ? Math.max(Number(existing), sc) : sc;
  await redis('HSET', dayHash, field, best);
  await redis('EXPIRE', dayHash, DAY_TTL);

  // Tüm alt-skorları oku, oyun-bazında ortalama al
  const vals = parseHash(await redis('HGETALL', dayHash));
  const gameDaily = (g) => {
    const subs = GAMES[g].map(l => vals[`${g}:${l}`]).filter(v => v != null).map(Number);
    if (!subs.length) return null;
    return subs.reduce((a, b) => a + b, 0) / subs.length;
  };
  const dDaily = gameDaily('duello');
  const pDaily = gameDaily('pense');
  const played = [dDaily, pDaily].filter(x => x != null);
  const overall = played.length ? Math.round(played.reduce((a, b) => a + b, 0) / played.length) : 0;

  // Haftalık = genel günlüklerin toplamı → bugünkü genel değiştiyse delta uygula
  const oldRaw = await redis('ZSCORE', `lb:day:${date}`, deviceKey);
  const oldDaily = oldRaw != null ? Number(oldRaw) : 0;
  const delta = overall - oldDaily;

  await redis('ZADD', `lb:day:${date}`, overall, deviceKey);
  await redis('EXPIRE', `lb:day:${date}`, DAY_TTL);
  if (delta !== 0) {
    await redis('ZINCRBY', `lb:week:${week}`, delta, deviceKey);
    await redis('EXPIRE', `lb:week:${week}`, WEEK_TTL);
  }

  const weeklyRaw = await redis('ZSCORE', `lb:week:${week}`, deviceKey);
  const weekly = weeklyRaw != null ? Math.round(Number(weeklyRaw)) : overall;

  return res.status(200).json({
    ok: true, date, game, level, levelScore: best,
    duelloDaily: dDaily != null ? Math.round(dDaily) : null,
    penseDaily: pDaily != null ? Math.round(pDaily) : null,
    overallDaily: overall,
    weekly,
  });
}
