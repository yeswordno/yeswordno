// ⚗️ Simya günlük kuyruk doğrulayıcı. node tools/verify-simya.js
// Denetler: (a) her target combos'ta var, (b) targets'ın TÜM parçaları o günün
// pieces'inde, (c) cooldown ihlali yok (aynı en < cooldown gün arayla), (d) parça 8-10.
/* eslint-disable no-undef */
import fs from 'fs';

const data = JSON.parse(fs.readFileSync('./src/data/simya.json', 'utf8'));
const enSet = new Set(data.combos.map(c => c.en));
const comboByEn = new Map(data.combos.map(c => [c.en, c]));
const OUT_DIR = './public/puzzles/simya';
const COOLDOWN = 30;

let errors = 0;
const err = m => { console.error('  ✗ ' + m); errors++; };

if (!fs.existsSync(OUT_DIR)) { console.error('simya kuyruk klasörü yok'); process.exit(1); }
const files = fs.readdirSync(OUT_DIR).filter(f => /^daily-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
if (!files.length) { console.error('kuyruk boş'); process.exit(1); }

const seenOn = new Map();   // en → [tarih...]
for (const f of files) {
  const p = JSON.parse(fs.readFileSync(`${OUT_DIR}/${f}`, 'utf8'));
  const pieceSet = new Set(p.pieces);
  // (d) parça sayısı
  if (p.pieces.length < 6 || p.pieces.length > 10) err(`${f}: parça sayısı ${p.pieces.length} (6-10 dışı)`);
  if (!p.targets || p.targets.length < 6 || p.targets.length > 8) err(`${f}: hedef sayısı ${p.targets?.length} (6-8 dışı)`);
  for (const t of p.targets || []) {
    // (a) combos'ta var
    if (!enSet.has(t.en)) { err(`${f}: hedef ${t.en} combos'ta yok`); continue; }
    // (b) parçalar o günün pieces'inde
    const combo = comboByEn.get(t.en);
    const missing = combo.parts.filter(pid => !pieceSet.has(pid));
    if (missing.length) err(`${f}: ${t.en} için eksik parça [${missing.join(',')}]`);
    // cooldown takibi
    (seenOn.get(t.en) || seenOn.set(t.en, []).get(t.en)).push(p.id);
  }
}

// (c) cooldown ihlali
for (const [en, dates] of seenOn) {
  const sorted = [...dates].sort();
  for (let i = 1; i < sorted.length; i++) {
    const gap = (new Date(sorted[i] + 'T00:00:00Z') - new Date(sorted[i - 1] + 'T00:00:00Z')) / 86400000;
    if (gap < COOLDOWN) err(`cooldown ihlali: ${en} ${sorted[i - 1]} → ${sorted[i]} (${gap}g < ${COOLDOWN})`);
  }
}

if (errors) { console.error(`\n❌ ${errors} hata`); process.exit(1); }
console.log(`✅ Simya kuyruğu temiz — ${files.length} gün doğrulandı.`);
