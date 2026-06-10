// ─────────────────────────────────────────────────────────────────
// tools/find-templates.js  — TEK SEFERLİK şablon arama scripti (Sorun 1b).
// Cron'a GİRMEZ. generator.js'in solver'ını ve sözlüğünü çoğaltır (bağımsız).
//
// Amaç: KATI dizi-kapsama kuralını (her ≥2 harf dizisinin bir soru hücresi
// kökü olması) geçen 8×8 şablonlar üretmek ve bunları 3 seviyenin sözlüğüyle
// çözülebilirlik testinden geçirmek. ≥%80 çözülen şablonları raporlar.
//
// Çalıştır:  node tools/find-templates.js [saniye]   (vars. 90 sn)
//
// BULGU (2026-06): ~70k–3.9M denemede katı kuralı geçen şablonlar çok nadir
// (~%0.0006) ve geçenler bu ~5k iki dilli sözlükle BİR KEZ bile dolmuyor.
// Sonuç: Sorun 1 (tam dizi-kapsama) mevcut sözlükle çözülemez — CLAUDE.md'deki
// "sahte sütun KAPANDI" notuyla birebir uyumlu. generator.js'e ENTEGRE EDİLMEDİ.
// Sözlük 10-100× büyürse yeniden denenebilir diye script saklandı.
// ─────────────────────────────────────────────────────────────────
/* eslint-disable no-undef */
import fs from 'fs';

const DEADLINE_SEC = Number(process.argv[2]) || 90;
const DEADLINE = Date.now() + DEADLINE_SEC * 1000;
const SIZE = 8;

// ── Sözlük (generator.buildDictionary mantığının kopyası + 2 harfli köprüler) ──
const DATA = './src/data';
const read = f => JSON.parse(fs.readFileSync(`${DATA}/${f}`, 'utf8'));
// generator.js FILLERS 2-harfli en listesi (köprüler) — 2 harfli slotlar için şart.
const FILLER_ENS = ['ON','IN','IT','DO','GO','WE','OK','OR','UP','AT','TO','BE','IS','HE','ME','US','IF','SO','AS','BY','MY','NO','HI','OF','AN','ID','TV','LI','NE','NA','MG','AL','SI','CL','AR','CA','TI','CR','MN','FE','CO','NI','CU','ZN','BR','KR','SR','ZR','MO','AG','SN','SB','TE','XE','BA','LA','CE','ND','PT','AU','HG','PB','BI','RN','RA','AC','TH','OS','IR','SE','RE','MI','FA','PC','CD','DJ','EU','UK','AM','PM','KG','KM','CM','MM','DR','MR','MS','DC'];

function buildDict(files) {
    let raw = [];
    files.forEach(f => { raw = raw.concat(read(f)); });
    const seen = new Set();
    const dict = [];
    raw.filter(i => !i._comment)
        .map(i => ({ tr: (i.tr || '').toLocaleUpperCase('tr-TR'), en: (i.en || '').toUpperCase().replace(/[^A-Z]/g, '') }))
        .filter(i => i.en.length >= 2)
        .filter(i => !/SİMGES|SIMGES/i.test(i.tr))
        .forEach(w => { if (!seen.has(w.en)) { seen.add(w.en); dict.push(w); } });
    FILLER_ENS.forEach(en => { if (!seen.has(en)) { seen.add(en); dict.push({ en, tr: en }); } });
    return dict;
}
const DICTS = {
    easy: buildDict(['a1_a2.json', 'common_short.json']),
    medium: buildDict(['a1_a2.json', 'b1_b2.json', 'common_short.json']),
    hard: buildDict(['b1_b2.json', 'c1_c2.json', 'academic.json', 'common_short.json']),
};

function indexDict(dict) {
    const byLen = {}, byLenPosChar = {};
    for (const w of dict) {
        const len = w.en.length;
        (byLen[len] = byLen[len] || []).push(w);
        byLenPosChar[len] = byLenPosChar[len] || {};
        for (let i = 0; i < len; i++) {
            const ch = w.en[i];
            byLenPosChar[len][i] = byLenPosChar[len][i] || {};
            (byLenPosChar[len][i][ch] = byLenPosChar[len][i][ch] || []).push(w);
        }
    }
    return { byLen, byLenPosChar };
}
const IDX = Object.fromEntries(Object.entries(DICTS).map(([k, d]) => [k, indexDict(d)]));

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ── KATI VALIDATOR (Sorun 1a) ──
//  - yan yana B yok
//  - her maksimal dikey L dizisi (≥2) → hemen ÜSTÜ D veya X
//  - her maksimal yatay L dizisi (≥2) → hemen SOLU R veya X
//  - 1-harf slot yok (R/X sağında / D/X altında tek L)
//  - orphan yok (her L en az bir kelimeye ait)
function validateStrict(t) {
    const errs = [];
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
        if (t[y][x] === 'B') {
            if (x + 1 < SIZE && t[y][x + 1] === 'B') errs.push('çiftB-yatay');
            if (y + 1 < SIZE && t[y + 1][x] === 'B') errs.push('çiftB-dikey');
        }
    }
    // yatay diziler
    for (let y = 0; y < SIZE; y++) {
        let x = 0;
        while (x < SIZE) {
            if (t[y][x] === 'L') {
                let s = x; while (x < SIZE && t[y][x] === 'L') x++;
                const len = x - s;
                const left = s - 1 >= 0 ? t[y][s - 1] : null;
                if (len >= 2 && !(left === 'R' || left === 'X')) errs.push(`yatay-köksüz(${s},${y})`);
                if (len === 1 && (left === 'R' || left === 'X')) errs.push(`1harf-yatay(${s},${y})`);
            } else x++;
        }
    }
    // dikey diziler
    for (let x = 0; x < SIZE; x++) {
        let y = 0;
        while (y < SIZE) {
            if (t[y][x] === 'L') {
                let s = y; while (y < SIZE && t[y][x] === 'L') y++;
                const len = y - s;
                const up = s - 1 >= 0 ? t[s - 1][x] : null;
                if (len >= 2 && !(up === 'D' || up === 'X')) errs.push(`dikey-köksüz(${x},${s})`);
                if (len === 1 && (up === 'D' || up === 'X')) errs.push(`1harf-dikey(${x},${s})`);
            } else y++;
        }
    }
    // orphan: her L yatay VEYA dikey bir kelimeye ait olmalı
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
        if (t[y][x] !== 'L') continue;
        let covH = false, covV = false;
        for (let cx = x - 1; cx >= 0; cx--) { const c = t[y][cx]; if (c === 'R' || c === 'X') { covH = true; break; } if (c !== 'L') break; }
        for (let cy = y - 1; cy >= 0; cy--) { const c = t[cy][x]; if (c === 'D' || c === 'X') { covV = true; break; } if (c !== 'L') break; }
        if (!covH && !covV) errs.push(`orphan(${x},${y})`);
    }
    return errs;
}

// Slotları çıkar
function extractSlots(t) {
    const slots = [];
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
        const c = t[y][x];
        if (c === 'R' || c === 'X') { const cells = []; let cx = x + 1; while (cx < SIZE && t[y][cx] === 'L') { cells.push(`${cx}-${y}`); cx++; } if (cells.length) slots.push({ cells, len: cells.length }); }
        if (c === 'D' || c === 'X') { const cells = []; let cy = y + 1; while (cy < SIZE && t[cy][x] === 'L') { cells.push(`${x}-${cy}`); cy++; } if (cells.length) slots.push({ cells, len: cells.length }); }
    }
    slots.sort((a, b) => b.len - a.len);
    return slots;
}

// Solver (generator.solve kopyası, sade)
function solveOnce(slots, idx) {
    const grid = {}; const usedEn = new Set(); const usedTr = new Set();
    let iter = 0; const MAX = 200000;
    function solve(i) {
        if (++iter > MAX) return 'TIMEOUT';
        if (i === slots.length) return true;
        const slot = slots[i]; const len = slot.len;
        const cons = [];
        for (let k = 0; k < len; k++) { const ch = grid[slot.cells[k]]; if (ch) cons.push([k, ch]); }
        let cands;
        if (!cons.length) cands = (idx.byLen[len] || []).filter(w => !usedEn.has(w.en) && !usedTr.has(w.tr));
        else {
            let base = null;
            for (const [p, ch] of cons) { const set = idx.byLenPosChar[len]?.[p]?.[ch] || []; if (base === null || set.length < base.length) base = set; }
            cands = (base || []).filter(w => !usedEn.has(w.en) && !usedTr.has(w.tr) && cons.every(([p, ch]) => w.en[p] === ch));
        }
        shuffle(cands);
        for (const w of cands) {
            const prev = { ...grid };
            for (let k = 0; k < len; k++) grid[slot.cells[k]] = w.en[k];
            usedEn.add(w.en); usedTr.add(w.tr);
            const r = solve(i + 1);
            if (r === true) return true;
            if (r === 'TIMEOUT') return 'TIMEOUT';
            Object.keys(grid).forEach(k => delete grid[k]); Object.assign(grid, prev);
            usedEn.delete(w.en); usedTr.delete(w.tr);
        }
        return false;
    }
    return solve(0);
}

// Bir şablonun seviye başına çözüm oranı (N deneme)
function solveRate(slots, idx, n = 12) {
    let ok = 0;
    for (let i = 0; i < n; i++) if (solveOnce(slots, idx) === true) ok++;
    return ok / n;
}

// ── Aday şablon üret + KATI kurala göre ONAR (köksüz runlara köken ekle) ──
// Saf rastgele neredeyse hiç geçerli şablon vermez; bu yüzden ürettikten sonra
// ihlalleri onararak geçerli yapıya yaklaştırıyoruz (daha çok geçerli örnek).
function randomTemplate() {
    const t = Array.from({ length: SIZE }, () => Array(SIZE).fill('L'));
    for (let x = 0; x < SIZE; x++) t[0][x] = Math.random() < 0.5 ? 'X' : 'D';
    for (let y = 1; y < SIZE; y++) t[y][0] = Math.random() < 0.7 ? 'R' : 'L';
    for (let y = 1; y < SIZE; y++) for (let x = 1; x < SIZE; x++) {
        const r = Math.random();
        if (r < 0.12) t[y][x] = 'X';
        else if (r < 0.20) t[y][x] = 'D';
        else if (r < 0.28) t[y][x] = 'R';
        else if (r < 0.33) t[y][x] = 'B';
    }
    // ONARIM: köksüz ≥2 dizilerin köküne X koy; tek-harf/orphan'ları B yap.
    for (let pass = 0; pass < 6; pass++) {
        let fixed = false;
        // dikey köksüz
        for (let x = 0; x < SIZE; x++) { let y = 0; while (y < SIZE) { if (t[y][x] === 'L') { const s = y; while (y < SIZE && t[y][x] === 'L') y++; const len = y - s; const up = s - 1 >= 0 ? t[s-1][x] : null; if (len >= 2 && !(up === 'D' || up === 'X')) { if (s - 1 >= 0) { t[s-1][x] = (t[s-1][x] === 'R') ? 'X' : 'D'; fixed = true; } else { t[s][x] = 'B'; fixed = true; } } } else y++; } }
        // yatay köksüz
        for (let y = 0; y < SIZE; y++) { let x = 0; while (x < SIZE) { if (t[y][x] === 'L') { const s = x; while (x < SIZE && t[y][x] === 'L') x++; const len = x - s; const left = s - 1 >= 0 ? t[y][s-1] : null; if (len >= 2 && !(left === 'R' || left === 'X')) { if (s - 1 >= 0) { t[y][s-1] = (t[y][s-1] === 'D') ? 'X' : 'R'; fixed = true; } else { t[y][s] = 'B'; fixed = true; } } } else x++; } }
        if (!fixed) break;
    }
    return t;
}

// ── Ana arama döngüsü ──
console.log(`🔎 Şablon aranıyor (${DEADLINE_SEC}s)... sözlük: easy ${DICTS.easy.length}, medium ${DICTS.medium.length}, hard ${DICTS.hard.length}`);
let tried = 0, passedValidator = 0, bestMinR = -1, bestInfo = '';
const winners = [];
while (Date.now() < DEADLINE) {
    tried++;
    const t = randomTemplate();
    if (validateStrict(t).length) continue;
    passedValidator++;
    const slots = extractSlots(t);
    if (slots.length < 12) continue;                 // çok seyrek → atla
    // hızlı ön-eleme: medium'da 1 çözüm var mı?
    if (solveOnce(slots, IDX.medium) !== true) continue;
    const rE = solveRate(slots, IDX.easy);
    const rM = solveRate(slots, IDX.medium);
    const rH = solveRate(slots, IDX.hard);
    const minR = Math.min(rE, rM, rH);
    if (minR > bestMinR) { bestMinR = minR; bestInfo = `${slots.length} slot | easy ${(rE*100)|0}% medium ${(rM*100)|0}% hard ${(rH*100)|0}%`; }
    if (minR >= 0.80) {
        winners.push({ t, slots: slots.length, rE, rM, rH });
        console.log(`  ✅ ADAY #${winners.length}: ${slots.length} slot | çöz easy ${(rE*100)|0}% medium ${(rM*100)|0}% hard ${(rH*100)|0}%`);
    }
}
console.log(`\nDenenen: ${tried} | katı validator geçen: ${passedValidator} | ≥%80 çözülen ADAY: ${winners.length}`);
if (bestMinR >= 0) console.log(`En iyi çözülebilirlik (min-seviye): %${(bestMinR*100)|0} → ${bestInfo}`);

if (winners.length) {
    winners.sort((a, b) => (b.slots - a.slots) || (Math.min(b.rE,b.rM,b.rH) - Math.min(a.rE,a.rM,a.rH)));
    const top = winners.slice(0, 5);
    const fmt = w => `    // slot ${w.slots} | çöz easy ${(w.rE*100)|0}% medium ${(w.rM*100)|0}% hard ${(w.rH*100)|0}%\n    [\n${w.t.map(r => "        ['" + r.join("', '") + "'],").join('\n')}\n    ],`;
    const out = `// find-templates.js çıktısı — en iyi ${top.length} şablon\nconst TEMPLATES = [\n${top.map(fmt).join('\n')}\n];\n`;
    fs.writeFileSync('./tools/found-templates.txt', out);
    console.log('🗂  En iyi 5 → tools/found-templates.txt');
} else {
    console.log('❌ Katı kuralı geçip ≥%80 çözülen şablon bulunamadı (CLAUDE.md tahminiyle uyumlu).');
}
