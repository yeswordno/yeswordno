// GET /api/mydaily?device=<deviceKey>
// Kullanıcının BUGÜNKÜ günlük dökümü: duello/pense ortalamaları + genel.
// (Kutu Pense kategori ekranında "Günlük ortalama puanınız" göstermek için.)
import { redis, parseHash, redisConfigured, istanbulDate, GAMES } from './_store.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  if (!redisConfigured()) return res.status(503).json({ error: 'backend-yok' });

  const deviceKey = req.query.device;
  if (!deviceKey) return res.status(400).json({ error: 'eksik' });

  const date = istanbulDate();
  const vals = parseHash(await redis('HGETALL', `day:${date}:${deviceKey}`));
  const gameDaily = (g) => {
    const subs = GAMES[g].map(l => vals[`${g}:${l}`]).filter(v => v != null).map(Number);
    if (!subs.length) return null;
    return Math.round(subs.reduce((a, b) => a + b, 0) / subs.length);
  };
  const dDaily = gameDaily('duello');
  const pDaily = gameDaily('pense');
  const played = [dDaily, pDaily].filter(x => x != null);
  const overall = played.length ? Math.round(played.reduce((a, b) => a + b, 0) / played.length) : null;

  return res.status(200).json({ date, duelloDaily: dDaily, penseDaily: pDaily, overallDaily: overall });
}
