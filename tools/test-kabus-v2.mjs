// Geçici test — kabusLogic v2 saf fonksiyon doğrulaması (commit edilmez)
import { pickSessionWords, questionFor, applyAnswer, computeScore, syncStagesWithReview, isTypedCorrect, isOptionCorrect } from '../src/utils/kabusLogic.js';

let pass = true;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) pass = false; };

const review = [{ en: 'win', tr: 'kazanmak' }, { en: 'book', tr: 'kitap' }, { en: 'tree', tr: 'ağaç' }, { en: 'house', tr: 'ev' }, { en: 'water', tr: 'su' }];
let stages = { win: { stage: 2, miss: 0, lastSeen: '2026-06-01' }, book: { stage: 1, miss: 1, lastSeen: '2026-06-05' }, ghost: { stage: 2, miss: 0, lastSeen: '2026-06-01' } };

// sync: ghost review'da yok → silinmeli (kabul kriteri 6)
stages = syncStagesWithReview(stages, review);
ok(!('ghost' in stages) && 'win' in stages, 'sync: review dışı kayıt temizlendi, içindekiler kaldı');

// pick: stage 2 (win) önce, sonra stage 1 (book)
const sess = pickSessionWords(review, stages, 10);
ok(sess[0].en === 'win' && sess[1].en === 'book', `öncelik: ${sess.map(w => w.en).join(',')} (win,book önde)`);

// sorular: etap biçimleri (kabul kriteri 3)
const q0 = questionFor(review[2], 0, review);
const q1 = questionFor(review[1], 1, review);
const q2 = questionFor(review[0], 2, review);
ok(q0.mode === 'tr-options' && q0.options.length === 4, 'etap 0: 4 TR şık');
ok(q1.mode === 'en-options' && q1.options.length === 4 && q1.options.some(o => isOptionCorrect(q1, o)), `etap 1 ters yön EN şıklar: ${q1.options.join(',')}`);
ok(q2.mode === 'type-en' && q2.options.length === 0 && q2.seconds === 20, 'etap 2: şık yok, yazma, 20sn');

// applyAnswer: stage2 doğru → freed + kayıt silinir
let r = applyAnswer(stages, { en: 'win', tr: 'kazanmak' }, true, '2026-06-11');
ok(r.freed === true && !('win' in r.stages), 'stage2 doğru → kurtuldu, kayıt silindi');
// stage1 yanlış → 0 + miss artar (kabul kriteri 2)
r = applyAnswer(stages, { en: 'book', tr: 'kitap' }, false, '2026-06-11');
ok(r.stages.book.stage === 0 && r.stages.book.miss === 2, 'yanlış → stage 0, miss arttı');
// stage0 doğru → 1
r = applyAnswer(stages, { en: 'tree', tr: 'ağaç' }, true, '2026-06-11');
ok(r.stages.tree.stage === 1, 'stage0 doğru → stage 1');

// yazma değerlendirme
ok(isTypedCorrect('win', { en: 'win' }) && isTypedCorrect(' WIN ', { en: 'win' }) && !isTypedCorrect('', { en: 'win' }), 'yazma: harf/boşluk toleransı, boş reddi');

// skor
ok(computeScore({ correct: 12, total: 15, freedCount: 3 }) === 72, 'skor 12/15+3 kurtarış = 72');
ok(computeScore({ correct: 15, total: 15, freedCount: 9 }) === 100, 'skor tavanı 100');
ok(computeScore({ correct: 0, total: 0, freedCount: 0 }) === 0, 'soru yoksa 0');

console.log(pass ? '\nTÜMÜ GEÇTİ' : '\nBAŞARISIZ');
process.exit(pass ? 0 : 1);
