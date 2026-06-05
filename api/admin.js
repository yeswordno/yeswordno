// /api/admin?token=SECRET&action=remove&nick=<nick>
// Bir takma adı tamamen kaldırır: nick rezervasyonu + kullanıcı kaydı + güncel
// günlük/haftalık tablolardan çıkarır. (Geçmiş günler TTL ile zaten düşer.)
// Koruma: ADMIN_TOKEN ortam değişkeni (Vercel → Settings → Environment Variables).
import { redis, redisConfigured, istanbulDate, isoWeekKey } from './_store.js';

export default async function handler(req, res) {
  if (!redisConfigured()) return res.status(503).json({ error: 'backend-yok' });

  const token = req.query.token || req.headers['x-admin-token'];
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'yetkisiz' });
  }

  const action = req.query.action || 'remove';
  const nick = (req.query.nick || '').trim();
  if (!nick) return res.status(400).json({ error: 'nick-eksik' });

  const lower = nick.toLocaleLowerCase('tr-TR');
  const deviceKey = await redis('GET', `nick:${lower}`);
  if (!deviceKey) return res.status(404).json({ error: 'bulunamadi' });

  if (action === 'remove') {
    const date = istanbulDate();
    const week = isoWeekKey(date);
    await redis('DEL', `nick:${lower}`);
    await redis('DEL', `user:${deviceKey}`);
    await redis('ZREM', `lb:day:${date}`, deviceKey);
    await redis('ZREM', `lb:week:${week}`, deviceKey);
    return res.status(200).json({ ok: true, removed: nick });
  }

  return res.status(400).json({ error: 'gecersiz-aksiyon' });
}
