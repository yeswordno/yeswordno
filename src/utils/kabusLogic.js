// 🏰 KÂBUS MODU v2 — "ÜÇ KAPI" Leitner sistemi (saf mantık, test edilebilir).
//
// NEDEN v2 (tasarım gerekçesi):
//   ESKİ: kurtarma yalnızca zafer anında oluyordu, TEK doğru cevap = öğrenildi
//   sayılıyordu ve kaybedince hiçbir ilerleme kalmıyordu.
//   YENİ: Leitner sistemi — kelime 3 farklı KANIT etabını geçerse kurtulur;
//   ilerleme oturumlar arası KALICIDIR; kısmi başarı asla yanmaz.
//
// Etaplar (her kelimenin stage değeri 0,1,2 → 3 = kurtuldu):
//   1. Kapı — TANI    (stage 0): EN sesli/yazılı → 4 TR şık   (pasif tanıma)
//   2. Kapı — HATIRLA (stage 1): TR yazılı → 4 EN şık (ters!)  (çift yönlü tanıma)
//   3. Kapı — YAZ     (stage 2): TR yazılı → EN kelimeyi yaz   (aktif üretim)
// Doğru → stage+1; stage===3 olduğu an kelime kurtulur (review→known).
// Yanlış → stage = FAIL_RESET_STAGE (klasik Leitner: başa döner).

export const FREED_STAGE = 3;          // bu etaba ulaşan kelime kurtulmuştur
export const FAIL_RESET_STAGE = 0;     // yanlışta dönülen etap (ileride 1'e yumuşatılabilir)
export const MAX_WORDS = 10;           // gece başına en fazla kelime
export const WAVES = 3;                // gecede dalga sayısı
export const TURN_SECONDS = 10;        // şıklı etaplarda süre
export const TYPE_SECONDS = 20;        // yazma etabında süre
export const MIN_REVIEW = 5;           // bu kadar review kelimesi yoksa mod kilitli

export const STAGE_NAMES = ['TANI', 'HATIRLA', 'YAZ'];

// ── Fisher-Yates karıştırma (sort(()=>Math.random()-0.5) KULLANMA) ──
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─────────────────────────────────────────────────────────────────
// KALICILIK — localStorage 'wordHunter_kabusStages'
//   { [en]: { stage: 0|1|2, miss: sayı, lastSeen: 'YYYY-MM-DD' } }
// İnce katman: saf fonksiyonlar storage'a dokunmaz, yalnız bu üçü dokunur.
// Geriye uyumluluk: anahtar yoksa tüm review kelimeleri stage 0 kabul edilir.
// ─────────────────────────────────────────────────────────────────
const STAGES_KEY = 'wordHunter_kabusStages';

export function loadStages() {
  try {
    const raw = localStorage.getItem(STAGES_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
  } catch {
    return {};   // bozuk veri → boş obje
  }
}

export function saveStages(stages) {
  try { localStorage.setItem(STAGES_KEY, JSON.stringify(stages)); } catch { /* dolu olabilir */ }
}

// Kelime review'dan BAŞKA yolla çıktıysa (örn. klasik modda öğrenildiyse)
// stages kaydını temizle — sızıntı olmasın. Oturum başında çağrılır.
export function syncStagesWithReview(stages, review) {
  const inReview = new Set(review.map(w => w.en));
  const synced = {};
  for (const [en, rec] of Object.entries(stages)) {
    if (inReview.has(en)) synced[en] = rec;
  }
  return synced;
}

export function stageOf(stages, en) {
  const s = stages[en]?.stage;
  return s === 1 || s === 2 ? s : 0;
}

// ─────────────────────────────────────────────────────────────────
// OTURUM KURULUMU
// ─────────────────────────────────────────────────────────────────
// review'dan min(MAX_WORDS, uzunluk) kelime seç.
// Öncelik: stage 2 > stage 1 > stage 0 (kapıya en yakın olan önce kurtulsun);
// eşitlikte lastSeen en eski önce; kalan eşitlikler Fisher-Yates ile kırılır.
export function pickSessionWords(review, stages, max = MAX_WORDS) {
  const ranked = shuffle(review)              // önce karıştır → eşitlikler rastgele
    .map(w => ({
      w,
      stage: stageOf(stages, w.en),
      lastSeen: stages[w.en]?.lastSeen || '0000-00-00',
    }))
    .sort((a, b) =>
      (b.stage - a.stage) ||                              // yüksek etap önce
      (a.lastSeen < b.lastSeen ? -1 : a.lastSeen > b.lastSeen ? 1 : 0)  // eski önce
    );
  return ranked.slice(0, Math.min(max, review.length)).map(r => r.w);
}

// ─────────────────────────────────────────────────────────────────
// SORU ÜRETİMİ — questionFor(word, stage, dictPool)
//   stage 0: { mode:'tr-options',  prompt: EN(sesli), options: 4 TR }
//   stage 1: { mode:'en-options',  prompt: TR(yazılı), options: 4 EN (benzer uzunlukta) }
//   stage 2: { mode:'type-en',     prompt: TR(yazılı) — EN dinletme YOK (kopya olur) }
// ─────────────────────────────────────────────────────────────────
const keyTr = s => (s || '').trim().toLocaleLowerCase('tr');
const keyEn = s => (s || '').trim().toLowerCase();

function pickDistractorsTr(word, pool) {
  const correct = (word.tr || '').trim();
  const seen = new Set([keyTr(correct)]);
  const out = [];
  for (const cand of shuffle(pool)) {
    const tr = (cand?.tr || '').trim();
    if (!tr) continue;
    const k = keyTr(tr);
    if (seen.has(k)) continue;
    seen.add(k); out.push(tr);
    if (out.length === 3) break;
  }
  return out;
}

// Etap 2 EN şıkları: havuzdan BENZER UZUNLUKTA (±1 harf) kelimeler tercih edilir
// (bariz uzunluk farkı cevabı ele vermesin); yetmezse herhangi biri.
function pickDistractorsEn(word, pool) {
  const correct = (word.en || '').trim();
  const targetLen = correct.length;
  const seen = new Set([keyEn(correct)]);
  const out = [];
  const shuffled = shuffle(pool);
  for (const nearOnly of [true, false]) {
    for (const cand of shuffled) {
      if (out.length === 3) break;
      const en = (cand?.en || '').trim();
      if (!en) continue;
      if (nearOnly && Math.abs(en.length - targetLen) > 1) continue;
      const k = keyEn(en);
      if (seen.has(k)) continue;
      seen.add(k); out.push(en);
    }
    if (out.length === 3) break;
  }
  return out;
}

export function questionFor(word, stage, dictPool) {
  if (stage === 0) {
    return {
      mode: 'tr-options',
      word, stage,
      options: shuffle([(word.tr || '').trim(), ...pickDistractorsTr(word, dictPool)]),
      seconds: TURN_SECONDS,
    };
  }
  if (stage === 1) {
    return {
      mode: 'en-options',
      word, stage,
      options: shuffle([(word.en || '').trim(), ...pickDistractorsEn(word, dictPool)]),
      seconds: TURN_SECONDS,
    };
  }
  return { mode: 'type-en', word, stage, options: [], seconds: TYPE_SECONDS };
}

// Şıklı etaplarda cevabın doğruluğu
export function isOptionCorrect(question, opt) {
  if (question.mode === 'tr-options') return keyTr(opt) === keyTr(question.word.tr);
  return keyEn(opt) === keyEn(question.word.en);
}

// Yazma etabı: EN kelimeyle birebir eşleşme (büyük/küçük harf + boşluklar önemsiz;
// EN kelimeler olduğundan Türkçe karakter normalizasyonu gerekmez).
export function isTypedCorrect(typed, word) {
  const norm = s => (s || '').trim().toLocaleUpperCase('en').replace(/\s+/g, ' ');
  const t = norm(typed);
  return Boolean(t) && t === norm(word.en);
}

// ─────────────────────────────────────────────────────────────────
// CEVAP UYGULAMA — applyAnswer(stages, word, correct, today)
//   Saf: yeni stages objesi + sonuç döndürür; storage'a DOKUNMAZ.
//   { stages, newStage, freed }  (freed=true → review→known taşıma çağıranın işi)
// ─────────────────────────────────────────────────────────────────
export function applyAnswer(stages, word, correct, today) {
  const prev = stages[word.en] || { stage: 0, miss: 0 };
  const cur = stageOf(stages, word.en);
  const next = { ...stages };

  if (correct) {
    const newStage = cur + 1;
    if (newStage >= FREED_STAGE) {
      delete next[word.en];                      // kurtuldu → kayıt zindandan silinir
      return { stages: next, newStage: FREED_STAGE, freed: true };
    }
    next[word.en] = { ...prev, stage: newStage, lastSeen: today };
    return { stages: next, newStage, freed: false };
  }

  next[word.en] = { ...prev, stage: FAIL_RESET_STAGE, miss: (prev.miss || 0) + 1, lastSeen: today };
  return { stages: next, newStage: FAIL_RESET_STAGE, freed: false };
}

// ─────────────────────────────────────────────────────────────────
// SKOR (0–100, leaderboard uyumlu) — yalnız oturum sonunda BİR kez gönderilir.
//   score = round( doğru/toplam * 60 + min(kurtarılan,5) * 8 )
//   (gecede 5+ kurtarış = tavan katkı)
// ─────────────────────────────────────────────────────────────────
export function computeScore({ correct, total, freedCount }) {
  if (!total) return 0;
  return Math.round((correct / total) * 60 + Math.min(freedCount, 5) * 8);
}
