// Skor tablosu istemcisi — cihaz anahtarı (UUID) ile kimlik, şifre yok.
// Anahtar localStorage'da saklanır; bir daha sorulmaz.
const DEVICE_KEY = 'wtr_device';
const NICK_KEY = 'wtr_nick';
const EMOJI_KEY = 'wtr_emoji';

export function getDeviceKey() {
  let k = localStorage.getItem(DEVICE_KEY);
  if (!k) {
    k = (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(DEVICE_KEY, k);
  }
  return k;
}

export function getNick() { return localStorage.getItem(NICK_KEY) || null; }
export function getEmoji() { return localStorage.getItem(EMOJI_KEY) || '🎮'; }
export function isRegistered() { return Boolean(getNick()); }

// Takma ad + emoji kaydet/güncelle. Başarılıysa yerelde de saklar.
export async function register(nick, emoji) {
  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceKey: getDeviceKey(), nick, emoji }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'hata');
  localStorage.setItem(NICK_KEY, data.nick);
  localStorage.setItem(EMOJI_KEY, data.emoji);
  return data;
}

// Bir seviyenin skorunu gönder (kayıtlı değilse sessizce atlar; hata oyunu bozmaz).
export async function submitScore(level, score) {
  if (!isRegistered()) return null;
  try {
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceKey: getDeviceKey(), level, score }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export async function fetchLeaderboard(type = 'day') {
  const res = await fetch(`/api/leaderboard?type=${type}&device=${encodeURIComponent(getDeviceKey())}`);
  if (!res.ok) throw new Error('hata');
  return await res.json();
}
