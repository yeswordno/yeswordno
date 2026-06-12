// ⚗️ KELİME SİMYACISI — saf mantık (test edilebilir; DOM/localStorage yok).
// Oyuncu anlam parçalarını (kelime/edat/kök/ek) kazanda SIRALI birleştirerek
// İngilizce kelime "üretir". Üç rütbe: Çırak(tier1 birleşik) → Kalfa(tier2 phrasal)
// → Usta(tier3 kök). Veri sözleşmesi src/data/simya.json.
//
// GENİŞLETME KURALI: simya.json'a yeni kayıt SONA eklenir, id'ler ASLA değişmez
// (cooldown geçmişi ve keşif kalıcılığı en/parts üzerinden tutulur).

// ── İndeksler ──
// partsKey = parts.join('+') → sıra önemlidir (EX+PORT ✓, PORT+EX ✗).
export function buildIndex(data) {
  const comboByParts = new Map();
  const comboByEn = new Map();
  const pieceById = new Map();
  for (const p of data.pieces) pieceById.set(p.id, p);
  for (const c of data.combos) {
    comboByParts.set(c.parts.join('+'), c);
    comboByEn.set(c.en, c);
  }
  return { comboByParts, comboByEn, pieceById };
}

// Kazandaki parça id dizisi geçerli bir combo mu? (sıralı birebir)
export function matchCombo(index, partIds) {
  if (!partIds || partIds.length < 2) return null;
  return index.comboByParts.get(partIds.join('+')) || null;
}

// Bir combo'nun "ailesi": tier3'te kök parçası, diğerlerinde ilk parça.
export function familyOf(index, combo) {
  let famId = combo.parts[0];
  if (combo.tier === 3) {
    const root = combo.parts.find(pid => index.pieceById.get(pid)?.type === 'root');
    if (root) famId = root;
  }
  const piece = index.pieceById.get(famId);
  return { id: famId, label: piece?.text || famId, tr: piece?.tr || '' };
}

// Tüm aileler + her ailenin combo'ları (kodeks/serbest atölye için).
export function familyMap(data, index) {
  const fams = new Map();
  for (const c of data.combos) {
    const fam = familyOf(index, c);
    if (!fams.has(fam.id)) fams.set(fam.id, { ...fam, combos: [] });
    fams.get(fam.id).combos.push(c);
  }
  return fams;
}

// ── Rütbe (keşif sayısından türetilir) ──
export const RANK_THRESHOLDS = { kalfa: 20, usta: 50 };
export function rankOf(discoveredCount) {
  if (discoveredCount >= RANK_THRESHOLDS.usta) return { key: 'usta', label: 'Usta', tier: 3 };
  if (discoveredCount >= RANK_THRESHOLDS.kalfa) return { key: 'kalfa', label: 'Kalfa', tier: 2 };
  return { key: 'cirak', label: 'Çırak', tier: 1 };
}
// Serbest atölyede hangi tier'lar açık (günlük kazan bundan MUAF)
export function unlockedTiers(discoveredCount) {
  const r = rankOf(discoveredCount);
  return r.tier >= 3 ? [1, 2, 3] : r.tier >= 2 ? [1, 2] : [1];
}

// ── Skor (0–100) — günlük kazan ──
//   bulunanHedef/toplam*70 + min(bonusKeşif,3)*5 + ipucu bileşeni(0–15)
//   ipucu bileşeni: hiç hint açılmadıysa 15; açtıkça oransal azalır.
export function computeDailyScore({ found, total, bonus = 0, hintsOpened = 0 }) {
  if (!total) return 0;
  const base = (found / total) * 70;
  const bonusPts = Math.min(bonus, 3) * 5;
  const hintPts = Math.max(0, Math.min(15, 15 * (1 - hintsOpened / total)));
  return Math.max(0, Math.min(100, Math.round(base + bonusPts + hintPts)));
}

// ── Esprili geçersiz-birleşim mesajları (deneyciliği ödüllendir, ceza yok) ──
export const INVALID_QUIPS = [
  'Simya buna izin vermiyor… ama merakını sevdim.',
  'Kazan tısladı: bu iki madde birbirini sevmedi.',
  'Hmm. Yeşil duman çıktı — bu bir kelime değil.',
  'Yaklaştın! Belki parçaların sırasını değiştir?',
  'Kadim kitap sayfayı çevirdi: böyle bir kelime yok.',
  'Köpürdü, taştı, söndü. Başka bir bileşim dene.',
];
export function randomQuip(rng = Math.random) {
  return INVALID_QUIPS[Math.floor(rng() * INVALID_QUIPS.length)];
}

// ── Kalıcılık şeması (referans; storage erişimi simyaStorage.js'te) ──
// localStorage['wordHunter_simya'] =
//   { discovered: { [en]: 'YYYY-MM-DD' }, dailyDone: { [date]: score }, sfx: bool }
export const SIMYA_KEY = 'wordHunter_simya';
export function emptyState() {
  return { discovered: {}, dailyDone: {}, sfx: true };
}
export function normalizeState(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  return {
    discovered: s.discovered && typeof s.discovered === 'object' ? s.discovered : {},
    dailyDone: s.dailyDone && typeof s.dailyDone === 'object' ? s.dailyDone : {},
    sfx: typeof s.sfx === 'boolean' ? s.sfx : true,
  };
}

// ── İnce localStorage katmanı (yalnız tarayıcıda çağrılır; bozuk veri → boş durum) ──
export function loadSimya() {
  try { return normalizeState(JSON.parse(localStorage.getItem(SIMYA_KEY))); }
  catch { return emptyState(); }
}
export function saveSimya(state) {
  try { localStorage.setItem(SIMYA_KEY, JSON.stringify(normalizeState(state))); } catch { /* dolu */ }
}
export function discoveredCount(state) {
  return Object.keys(state.discovered || {}).length;
}

