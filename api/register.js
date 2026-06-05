// POST /api/register  { deviceKey, nick, emoji }
// Takma adı cihaz anahtarına bağlar (şifre yok). Nick benzersizdir.
import { redis, redisConfigured } from './_store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!redisConfigured()) return res.status(503).json({ error: 'backend-yok' });

  const { deviceKey, nick, emoji } = req.body || {};
  if (!deviceKey || !nick) return res.status(400).json({ error: 'eksik' });

  const cleanNick = String(nick).trim().replace(/\s+/g, ' ').slice(0, 20);
  if (cleanNick.length < 2) return res.status(400).json({ error: 'nick-kisa' });
  const lower = cleanNick.toLocaleLowerCase('tr-TR');
  const safeEmoji = (emoji && String(emoji).slice(0, 8)) || '🎮';

  // Bu nick başka bir cihaza mı ait?
  const owner = await redis('GET', `nick:${lower}`);
  if (owner && owner !== deviceKey) return res.status(409).json({ error: 'nick-dolu' });

  // Cihazın eski nick'i varsa ve değiştiyse, eski nick rezervasyonunu bırak
  const prevRaw = await redis('GET', `user:${deviceKey}`);
  if (prevRaw) {
    try {
      const prev = JSON.parse(prevRaw);
      if (prev.nickLower && prev.nickLower !== lower) await redis('DEL', `nick:${prev.nickLower}`);
    } catch { /* yoksay */ }
  }

  await redis('SET', `nick:${lower}`, deviceKey);
  await redis('SET', `user:${deviceKey}`, JSON.stringify({ nick: cleanNick, nickLower: lower, emoji: safeEmoji }));

  return res.status(200).json({ ok: true, nick: cleanNick, emoji: safeEmoji });
}
