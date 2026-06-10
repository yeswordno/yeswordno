// Kâbus Modu — saf mantık (test edilebilir). UI/DOM/localStorage YOK.
// Tur üretimi, distractor seçimi, hasar/skor hesabı.

export const GHOST_HP_PER_WORD = 10;   // hayalet HP = kelime sayısı × 10
export const PLAYER_LIVES = 3;         // ❤️❤️❤️
export const NORMAL_DAMAGE = 10;       // doğru cevap → hayalete hasar
export const CRIT_DAMAGE = 25;         // combo yazma sorusu doğru → kritik vuruş
export const TURN_SECONDS = 10;        // her tur süre
export const MAX_WORDS = 12;           // oturum başına en fazla kelime
export const COMBO_FOR_CRIT = 3;       // kaç doğru üst üste sonra yazma sorusu

// Fisher-Yates karıştırma (sort(()=>Math.random()-0.5) KULLANMA).
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Oturum kelimelerini seç: review listesinden rastgele min(MAX_WORDS, uzunluk).
export function pickSessionWords(review, max = MAX_WORDS) {
  return shuffle(review).slice(0, Math.min(max, review.length));
}

// Bir kelime için 4 Türkçe seçenek üret (1 doğru + 3 distractor), karışık sırada.
// pool: distractor havuzu ({ en, tr } dizisi). Doğru tr ile eşleşenleri ve
// duplicate'leri eler.
export function buildOptions(word, pool) {
  const correct = (word.tr || '').trim();
  const seen = new Set([correct.toLocaleLowerCase('tr')]);
  const distractors = [];
  for (const cand of shuffle(pool)) {
    const tr = (cand?.tr || '').trim();
    if (!tr) continue;
    const key = tr.toLocaleLowerCase('tr');
    if (seen.has(key)) continue;
    seen.add(key);
    distractors.push(tr);
    if (distractors.length === 3) break;
  }
  return shuffle([correct, ...distractors]);
}

// Skor (0–100, mevcut ölçekle uyumlu).
export function computeScore({ correct, total, livesLeft, criticals }) {
  if (!total) return 0;
  return Math.round(
    (correct / total) * 70 +
    (livesLeft / PLAYER_LIVES) * 20 +
    (criticals > 0 ? 10 : 0)
  );
}

// Karşılaştırma için "katla": büyük/küçük harf, boşluk, noktalama ve Türkçe
// noktalı/noktasız i farkı (i/İ/I/ı) önemsiz olsun. Aksanlar da sadeleşir.
// Böylece "win" yazınca tr-locale'in ürettiği "WİN" gibi farklar sorun olmaz.
export function fold(s) {
  return (s || '')
    .replace(/[İIı]/g, 'i')          // tüm i varyantlarını sade i'ye indir
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // birleşik aksan işaretlerini at
    .replace(/[^a-z0-9]/g, '');      // yalnız harf/rakam (boşluk/tire/noktalama yok)
}

export function isTypedCorrect(typed, word) {
  // Yazma turunda HEM İngilizce kelime HEM Türkçe karşılık kabul edilir
  // (oyuncu hangisini yazarsa yazsın); karşılaştırma harf-katlamalıdır.
  const t = fold(typed);
  if (!t) return false;
  return t === fold(word.en) || t === fold(word.tr);
}
