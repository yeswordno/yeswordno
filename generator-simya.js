// ⚗️ KELİME SİMYACISI — Günlük Kazan üretici (generator.js kalıbıyla).
// İstanbul tarihi, 7 günlük tampon kuyruk, per-en cooldown, deterministik RNG.
// Çıktı: public/puzzles/simya/daily-<YYYY-MM-DD>.json (her gün ayrı dosya) +
// bugün için public/puzzles/daily-simya.json + history.json.
// Cron'a girer (daily-puzzle.yml). İstemci combo cevaplarını simya.json'dan
// doğrular; puzzle dosyasına TR/parts yazılmaz (küçük kalsın).
/* eslint-disable no-undef */
import fs from 'fs';

const SEED_PATH = './src/data/simya.json';
const OUT_DIR = './public/puzzles/simya';
const HISTORY_PATH = `${OUT_DIR}/history.json`;
const TODAY_COPY = './public/puzzles/daily-simya.json';
const BUFFER_DAYS = 7;
let COOLDOWN_DAYS = 30;            // combo bu kadar gün içinde hedef olduysa elenir
// TODO: veri 200+ combo'ya çıkınca COOLDOWN_DAYS = 60 yap (havuz rahatlar).
const TARGETS_MIN = 6, TARGETS_MAX = 8;
const PIECES_MAX = 10;

const data = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
const combos = data.combos;
const byTier = { 1: [], 2: [], 3: [] };
for (const c of combos) (byTier[c.tier] || (byTier[c.tier] = [])).push(c);

// ── Deterministik RNG: mulberry32 + tarih hash (her gün herkese aynı set) ──
function hashStr(s) { let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return h >>> 0; }
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(arr, rng) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ── Tarih (İstanbul) ──
function istanbulDate() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date()); }
function addDays(dateStr, n) { const d = new Date(dateStr + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

// ── History ──
let history = [];
if (fs.existsSync(HISTORY_PATH)) { try { history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8')); } catch { history = []; } }
function recentEns(refDate, days) {
  const ref = new Date(refDate + 'T00:00:00Z');
  const cutoff = new Date(ref); cutoff.setUTCDate(cutoff.getUTCDate() - days);
  const set = new Set();
  for (const e of history) {
    if (!e || !e.date || e.date === refDate) continue;
    const d = new Date(e.date + 'T00:00:00Z');
    if (d >= cutoff && d < ref) (e.ens || []).forEach(en => set.add(en));
  }
  return set;
}

// ── Bir günün hedef setini kur ──
// Tier karışımı: 4×t1 + 2×t2 + 1-2×t3. Parça birleşimi ≤10 olacak şekilde,
// parça paylaşan hedefleri tercih ederek (aynı aile = bedava sinerji) seç.
function buildDay(dateStr) {
  const rng = mulberry32(hashStr('simya-' + dateStr));
  let cooldown = COOLDOWN_DAYS;
  let recent = recentEns(dateStr, cooldown);

  // t3 ÖNCE: kökler 2 yeni parça getirir; erken seçilince aynı kök ailesinden
  // 2. hedef neredeyse bedava gelir (port_r → EXPORT+IMPORT = 3 parça/2 kelime).
  // Sonra t1/t2 parça tavanına kadar doldurur. (Günlük kazan tier kilidinden muaf.)
  const tierPlan = [3, 3, 1, 1, 1, 2, 2, 1];
  function avail(tier) { return byTier[tier].filter(c => !recent.has(c.en)); }

  // Emniyet supabı: herhangi bir tier'da aday < ihtiyaç×2 ise cooldown'u 15'e indir.
  const need = { 1: 4, 2: 2, 3: 2 };
  if ([1, 2, 3].some(t => avail(t).length < need[t] * 2)) {
    cooldown = 15; recent = recentEns(dateStr, cooldown);
    console.log(`⚠ simya: aday havuzu dar → cooldown ${cooldown}g (${dateStr})`);
  }

  const chosen = [];
  const usedPieces = new Set();
  const usedEns = new Set();

  function pieceCount(extraCombo) {
    const s = new Set(usedPieces);
    for (const p of extraCombo.parts) s.add(p);
    return s.size;
  }

  // greedy: plandaki her tier için, parça paylaşımı en yüksek (yeni parça en az)
  // adayı seç; parça tavanını aşacaksa atla.
  for (const tier of tierPlan) {
    if (chosen.length >= TARGETS_MAX) break;
    let pool = shuffle(avail(tier).filter(c => !usedEns.has(c.en)), rng);
    // yeni parça sayısına göre sırala (sinerjiyi tercih et)
    pool.sort((a, b) => pieceCount(a) - pieceCount(b));
    const pick = pool.find(c => pieceCount(c) <= PIECES_MAX);
    if (!pick) continue;
    chosen.push(pick); usedEns.add(pick.en);
    pick.parts.forEach(p => usedPieces.add(p));
  }

  // En az TARGETS_MIN'e ulaş: kalan tüm tier'lardan parça tavanına uyan ekle
  if (chosen.length < TARGETS_MIN) {
    const rest = shuffle(combos.filter(c => !usedEns.has(c.en) && !recent.has(c.en)), rng)
      .sort((a, b) => pieceCount(a) - pieceCount(b));
    for (const c of rest) {
      if (chosen.length >= TARGETS_MAX) break;
      if (pieceCount(c) <= PIECES_MAX) { chosen.push(c); usedEns.add(c.en); c.parts.forEach(p => usedPieces.add(p)); }
    }
  }

  const pieces = [...usedPieces];
  const targets = chosen.map(c => ({ en: c.en, hint: c.hint, tier: c.tier }));
  return { id: dateStr, pieces, targets };
}

// ── Kuyruğu doldur ──
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
const today = istanbulDate();
const targetDates = Array.from({ length: BUFFER_DAYS }, (_, i) => addDays(today, i));
console.log(`\n⚗️ Simya — bugün ${today}, ${BUFFER_DAYS} günlük tampon\n`);

let generated = 0, reused = 0, todayFail = 0;
for (const date of targetDates) {
  const path = `${OUT_DIR}/daily-${date}.json`;
  if (fs.existsSync(path)) {
    reused++; console.log(`   ↺ ${date} hazır`);
    // history'de yoksa ekle (dedup kaynağı)
    if (!history.some(e => e.date === date)) {
      try { const p = JSON.parse(fs.readFileSync(path, 'utf8')); history.push({ date, ens: p.targets.map(t => t.en) }); } catch { /* yok say */ }
    }
    continue;
  }
  const day = buildDay(date);
  if (day.targets.length < TARGETS_MIN || day.pieces.length > PIECES_MAX) {
    console.error(`   ⚠️ ${date} üretilemedi (hedef ${day.targets.length}, parça ${day.pieces.length})`);
    if (date === today) todayFail++;
    continue;
  }
  fs.writeFileSync(path, JSON.stringify(day, null, 2));
  history = history.filter(e => e.date !== date);
  history.push({ date, ens: day.targets.map(t => t.en) });
  generated++;
  console.log(`   🎉 ${date}: ${day.targets.length} hedef, ${day.pieces.length} parça`);
}

// Geçmiş günleri kuyruktan düşür (dosya bırak; sadece bugün+ileri tutulur listede)
// Eski daily-*.json'ları temizle (bugünden önceki)
for (const f of fs.readdirSync(OUT_DIR)) {
  const m = f.match(/^daily-(\d{4}-\d{2}-\d{2})\.json$/);
  if (m && m[1] < today) { fs.unlinkSync(`${OUT_DIR}/${f}`); }
}

// Bugünün kopyası (istemci kolay çeksin)
const todayPath = `${OUT_DIR}/daily-${today}.json`;
if (fs.existsSync(todayPath)) fs.copyFileSync(todayPath, TODAY_COPY);

history = history.slice(-400);
fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
console.log(`\n✅ Simya: ${generated} yeni, ${reused} hazır. Geçmiş ${history.length}.\n`);
if (todayFail > 0) process.exit(1);
