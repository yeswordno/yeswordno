// Upstash Redis REST yardımcıları — fetch tabanlı, EK BAĞIMLILIK YOK.
// Vercel: "_" ile başlayan dosyalar endpoint sayılmaz; sadece import edilir.
// Gerekli ortam değişkenleri (Upstash entegrasyonu Vercel'e otomatik ekler):
//   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
// Upstash entegrasyonu UPSTASH_REDIS_REST_*; eski Vercel KV ise KV_REST_API_* adıyla
// enjekte eder. İkisini de kabul et (hangi yolla bağlarsan bağla çalışsın).
const URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

export function redisConfigured() {
  return Boolean(URL && TOKEN);
}

// Tek komut: redis('SET','k','v') → sonucu döndürür
export async function redis(...cmd) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.result;
}

// HGETALL sonucunu nesneye çevir (REST düz dizi [field,value,...] döndürebilir)
export function parseHash(x) {
  if (!x) return {};
  if (Array.isArray(x)) { const o = {}; for (let i = 0; i < x.length; i += 2) o[x[i]] = x[i + 1]; return o; }
  return x;
}

// ── Tarih / ISO hafta (İstanbul takvimi) ──
export function istanbulDate(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(d);
}

// ISO hafta anahtarı: "2026-W23" (Pazartesi başlangıç, standart ISO-8601)
export function isoWeekKey(dateStr) {
  const date = new Date(dateStr + 'T00:00:00Z');
  const target = new Date(date.valueOf());
  const dayNr = (date.getUTCDay() + 6) % 7;          // Pzt=0 … Paz=6
  target.setUTCDate(target.getUTCDate() - dayNr + 3); // o haftanın Perşembesi
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
  }
  const week = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const year = new Date(firstThursday).getUTCFullYear();
  return `${year}-W${String(week).padStart(2, '0')}`;
}

// Günlük Düello seviyeleri + Kutu Kutu Pense kategorileri.
// Skor tablosu: her oyun KENDİ alt-skorlarının ortalamasını alır, genel günlük =
// oynanan OYUNLARIN ortalaması (duello + pense)/oynanan.
export const LEVELS = ['easy', 'medium', 'hard'];
export const PENSE_LEVELS = ['a1_a2', 'b1_b2', 'c1_c2', 'academic'];
export const KABUS_LEVELS = ['standard'];
export const SIMYA_LEVELS = ['daily', 'free'];   // free skor GÖNDERMEZ; yalnız daily akar
export const GAMES = {
  duello: LEVELS,
  pense: PENSE_LEVELS,
  kabus: KABUS_LEVELS,
  simya: SIMYA_LEVELS,
};
export const DAY_TTL = 60 * 60 * 24 * 9;    // günlük anahtarlar ~9 gün
export const WEEK_TTL = 60 * 60 * 24 * 40;  // haftalık anahtarlar ~40 gün
