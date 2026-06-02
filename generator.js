import fs from 'fs';

// 1. TÜM SÖZLÜK DOSYALARINI OTOMATİK OKU VE BİRLEŞTİR
// Sözlükler uygulamanın src/data klasöründe duruyor.
const DATA_DIR = './src/data';
const dictFiles = ['fillers.json', 'a1_a2.json', 'b1_b2.json', 'c1_c2.json', 'academic.json'];
let rawDict = [];

dictFiles.forEach(file => {
    const path = `${DATA_DIR}/${file}`;
    if (fs.existsSync(path)) {
        const rawData = fs.readFileSync(path, 'utf8');
        rawDict = rawDict.concat(JSON.parse(rawData));
        console.log(`[+] ${file} başarıyla yüklendi.`);
    } else {
        console.log(`[-] ${file} bulunamadı, atlanıyor.`);
    }
});

if (rawDict.length === 0) {
    console.error("HATA: Hiçbir JSON dosyası bulunamadı!");
    process.exit(1);
}

// 2. SÖZLÜĞÜ OYUNA UYGUN FORMATLA
let dictionary = rawDict
    .filter(item => !item._comment)
    .map(item => ({
        tr: item.tr.toLocaleUpperCase('tr-TR'),
        en: item.en.toUpperCase().replace(/[^A-Z]/g, '')
    }))
    .filter(item => item.en.length >= 1);

// KÖPRÜ KELİMELER
const fillers = [
    { tr: "ÜZERİNDE", en: "ON" }, { tr: "İÇİNDE", en: "IN" },
    { tr: "O (Cansız)", en: "IT" }, { tr: "YAPMAK", en: "DO" },
    { tr: "GİTMEK", en: "GO" }, { tr: "BİZ", en: "WE" },
    { tr: "TAMAM", en: "OK" }, { tr: "VEYA", en: "OR" },
    { tr: "YUKARI", en: "UP" }
];
fillers.forEach(f => { if (!dictionary.some(d => d.en === f.en)) dictionary.push(f); });

console.log(`Sözlük hazır. Toplam kelime havuzu: ${dictionary.length}`);

// ─────────────────────────────────────────────────────────────────
// 2.5 TEKRAR ÖNLEME — son COOLDOWN_DAYS günde kullanılan kelimeleri ele
//     (2 harfli köprü kelimeler muaf; yoksa kısa kutucuklar tıkanır)
// ─────────────────────────────────────────────────────────────────
const COOLDOWN_DAYS = 60;                       // bu kadar gün aynı kelime tekrar çıkmaz
const HISTORY_PATH = './public/puzzles/history.json';

let history = [];
if (fs.existsSync(HISTORY_PATH)) {
    try { history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8')); }
    catch { history = []; }
}

const cutoff = new Date();
cutoff.setDate(cutoff.getDate() - COOLDOWN_DAYS);
const recentWords = new Set();
for (const entry of history) {
    if (!entry || !entry.date) continue;
    if (new Date(entry.date) >= cutoff) {
        (entry.words || []).forEach(w => recentWords.add(w));
    }
}

const beforeCount = dictionary.length;
dictionary = dictionary.filter(item => item.en.length <= 2 || !recentWords.has(item.en));
console.log(`Tekrar önleme: son ${COOLDOWN_DAYS} günde ${recentWords.size} kelime kullanılmış, ${beforeCount - dictionary.length} aday elendi. Kalan: ${dictionary.length}`);

// ─────────────────────────────────────────────────────────────────
// 3. 5 FARKLI ŞABLON
//    R  = Sağa soru  (clue, sağdaki L'ler bu kelimenin harfleri)
//    D  = Aşağı soru (clue, aşağıdaki L'ler bu kelimenin harfleri)
//    X  = Çift yön   (hem sağa HEM aşağı soru — tek kutucuk, 2 kelime)
//    L  = Harf kutusu
//    B  = Boş / pasif (max 7 adet)
// ─────────────────────────────────────────────────────────────────
const TEMPLATES = [

    // ── Şablon 1: Klasik zigzag (7 B hücresi) ──────────────────
    // Doğrulanmış, orijinal tasarım.
    [
        ['D', 'R', 'L', 'L', 'L', 'L', 'L', 'L'],  // D(0,0)=6harf↓ | R(1,0)=6harf→
        ['L', 'B', 'D', 'B', 'D', 'B', 'D', 'B'],  // D sütunları: 2,4,6
        ['L', 'R', 'L', 'L', 'L', 'L', 'L', 'D'],  // R(1,2)=5harf→ | D(7,2)=5harf↓
        ['L', 'B', 'L', 'R', 'L', 'L', 'L', 'L'],  // R(3,3)=4harf→
        ['L', 'R', 'L', 'L', 'L', 'L', 'L', 'L'],  // R(1,4)=6harf→
        ['L', 'B', 'L', 'D', 'L', 'R', 'L', 'L'],  // D(3,5)=2harf↓ | R(5,5)=2harf→
        ['L', 'R', 'L', 'L', 'L', 'L', 'B', 'L'],  // R(1,6)=4harf→
        ['R', 'L', 'L', 'L', 'L', 'L', 'L', 'L'],  // R(0,7)=7harf→
    ],

    // ── Şablon 2: Zigzag varyant (7 B hücresi) ─────────────────
    // T1 zigzag'a benzer, satır 5 farklı. Doğrulandı.
    [
        ['D', 'R', 'L', 'L', 'L', 'L', 'L', 'L'],
        ['L', 'B', 'D', 'B', 'D', 'B', 'D', 'B'],
        ['L', 'R', 'L', 'L', 'L', 'L', 'L', 'D'],
        ['L', 'B', 'L', 'R', 'L', 'L', 'L', 'L'],
        ['L', 'R', 'L', 'L', 'L', 'L', 'L', 'L'],
        ['L', 'B', 'D', 'R', 'L', 'L', 'L', 'L'],  // D(2,5)=2harf↓ | R(3,5)=4harf→
        ['L', 'R', 'L', 'L', 'L', 'L', 'B', 'L'],
        ['R', 'L', 'L', 'L', 'L', 'L', 'L', 'L'],
    ],

    // ── Şablon 3: Klasik zigzag — Şablon 1 ile aynı yapı ─────────
    // Farklı rastgele kelimeler üretilir. Yapı Şablon 1 ile aynı.
    [
        ['D', 'R', 'L', 'L', 'L', 'L', 'L', 'L'],
        ['L', 'B', 'D', 'B', 'D', 'B', 'D', 'B'],
        ['L', 'R', 'L', 'L', 'L', 'L', 'L', 'D'],
        ['L', 'B', 'L', 'R', 'L', 'L', 'L', 'L'],
        ['L', 'R', 'L', 'L', 'L', 'L', 'L', 'L'],
        ['L', 'B', 'L', 'D', 'L', 'R', 'L', 'L'],
        ['L', 'R', 'L', 'L', 'L', 'L', 'B', 'L'],
        ['R', 'L', 'L', 'L', 'L', 'L', 'L', 'L'],
    ],

    // ── Şablon 4: Üst sıra D soruları + X(0,3) çift yön (5 B) ────
    // Çift yön (X) hücreli yapı. Doğrulandı.
    [
        ['D', 'R', 'L', 'L', 'L', 'L', 'L', 'D'],  // D(0,0) + D(7,0)
        ['L', 'B', 'D', 'B', 'D', 'B', 'D', 'L'],
        ['L', 'R', 'L', 'L', 'L', 'L', 'L', 'L'],
        ['X', 'L', 'L', 'L', 'L', 'R', 'L', 'L'],  // X(0,3): sağ + aşağı
        ['L', 'R', 'L', 'L', 'L', 'L', 'L', 'L'],
        ['L', 'B', 'L', 'D', 'L', 'R', 'L', 'L'],
        ['L', 'R', 'L', 'L', 'L', 'L', 'B', 'L'],
        ['R', 'L', 'L', 'L', 'L', 'L', 'L', 'L'],
    ],

    // ── Şablon 5: Klasik zigzag — T1'in aynısı ────────────────────
    // Farklı rastgele kelimeler üretilir. Yapı T1 ile aynı.
    [
        ['D', 'R', 'L', 'L', 'L', 'L', 'L', 'L'],
        ['L', 'B', 'D', 'B', 'D', 'B', 'D', 'B'],
        ['L', 'R', 'L', 'L', 'L', 'L', 'L', 'D'],
        ['L', 'B', 'L', 'R', 'L', 'L', 'L', 'L'],
        ['L', 'R', 'L', 'L', 'L', 'L', 'L', 'L'],
        ['L', 'B', 'L', 'D', 'L', 'R', 'L', 'L'],
        ['L', 'R', 'L', 'L', 'L', 'L', 'B', 'L'],
        ['R', 'L', 'L', 'L', 'L', 'L', 'L', 'L'],
    ],
];

// ─────────────────────────────────────────────────────────────────
// 4. ŞABLON DOĞRULAYICI — her L hücresinin en az 1 kelimeyle
//    kapsandığını ve hiç yan yana B olmadığını kontrol eder.
// ─────────────────────────────────────────────────────────────────
function validateTemplate(tmpl) {
    const ROWS = tmpl.length;
    const COLS = tmpl[0].length;
    const errors = [];

    // Yan yana B kontrolü
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (tmpl[y][x] === 'B') {
                if (x + 1 < COLS && tmpl[y][x + 1] === 'B') errors.push(`Yatay çift B: (${x},${y})-(${x+1},${y})`);
                if (y + 1 < ROWS && tmpl[y + 1][x] === 'B') errors.push(`Dikey çift B: (${x},${y})-(${x},${y+1})`);
            }
        }
    }

    // Her L hücresinin kapsandığını kontrol et
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (tmpl[y][x] !== 'L') continue;
            let covered = false;

            // Sola bak: R veya X var mı?
            for (let cx = x - 1; cx >= 0; cx--) {
                const t = tmpl[y][cx];
                if (t === 'R' || t === 'X') { covered = true; break; }
                if (t !== 'L') break;
            }
            // Yukarı bak: D veya X var mı?
            if (!covered) {
                for (let cy = y - 1; cy >= 0; cy--) {
                    const t = tmpl[cy][x];
                    if (t === 'D' || t === 'X') { covered = true; break; }
                    if (t !== 'L') break;
                }
            }

            if (!covered) errors.push(`Kapsanmayan L hücresi: (${x},${y})`);
        }
    }

    return errors;
}

// Başlangıçta tüm şablonları doğrula
TEMPLATES.forEach((tmpl, i) => {
    const errs = validateTemplate(tmpl);
    if (errs.length > 0) {
        console.error(`\n⚠️  Şablon ${i + 1} hatalı:`);
        errs.forEach(e => console.error('   ' + e));
        process.exit(1);
    }
});
console.log(`✅ Tüm ${TEMPLATES.length} şablon doğrulandı.\n`);

// ─────────────────────────────────────────────────────────────────
// 5. POZİSYON İNDEKSİ — hızlı aday filtrelemesi için
//    byLenPosChar[len][pos][char] = sözcük nesneleri dizisi
// ─────────────────────────────────────────────────────────────────
const byLenPosChar = {};
const byLen = {};
for (const w of dictionary) {
    const len = w.en.length;
    if (!byLen[len]) byLen[len] = [];
    byLen[len].push(w);
    if (!byLenPosChar[len]) byLenPosChar[len] = {};
    for (let i = 0; i < len; i++) {
        const ch = w.en[i];
        if (!byLenPosChar[len][i]) byLenPosChar[len][i] = {};
        if (!byLenPosChar[len][i][ch]) byLenPosChar[len][i][ch] = [];
        byLenPosChar[len][i][ch].push(w);
    }
}

// ─────────────────────────────────────────────────────────────────
// 6. BULMACA ÜRETİCİ
// ─────────────────────────────────────────────────────────────────
function generatePuzzle(dateString) {
    // Rastgele şablon seç
    const templateIndex = Math.floor(Math.random() * TEMPLATES.length);
    const template = TEMPLATES[templateIndex];
    console.log(`Şablon ${templateIndex + 1} seçildi.`);

    const ROWS = template.length;
    const COLS = template[0].length;

    // ── Slotları çıkar ──────────────────────────────────────────
    let slots = [];
    let slotId = 1;

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const t = template[y][x];

            // Sağa yönlü slot: R veya X
            if (t === 'R' || t === 'X') {
                let cells = [], cx = x + 1;
                while (cx < COLS && template[y][cx] === 'L') { cells.push(`${cx}-${y}`); cx++; }
                if (cells.length > 0) slots.push({ id: `w${slotId++}`, dir: 'right', x, y, length: cells.length, cells });
            }

            // Aşağı yönlü slot: D veya X
            if (t === 'D' || t === 'X') {
                let cells = [], cy = y + 1;
                while (cy < ROWS && template[cy][x] === 'L') { cells.push(`${x}-${cy}`); cy++; }
                if (cells.length > 0) slots.push({ id: `w${slotId++}`, dir: 'down', x, y, length: cells.length, cells });
            }
        }
    }

    // Uzun kelimeler önce yerleştirilsin (daha az backtrack)
    slots.sort((a, b) => b.length - a.length);

    let gridLetters = {};
    let placedWords = {};
    let usedEnglishWords = new Set();

    let iterations = 0;
    const MAX_ITERATIONS = 300000;

    // Fisher-Yates karıştırma (yerinde)
    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function solve(slotIndex) {
        iterations++;
        if (iterations > MAX_ITERATIONS) return "RESTART";
        if (slotIndex === slots.length) return true;

        const currentSlot = slots[slotIndex];
        const len = currentSlot.length;

        // Mevcut kısıtları topla (hücre pozisyonu → harf)
        const constraints = [];
        for (let i = 0; i < len; i++) {
            const ch = gridLetters[currentSlot.cells[i]];
            if (ch) constraints.push([i, ch]);
        }

        // Aday listesini kısıtlara göre belirle
        let candidates;
        if (constraints.length === 0) {
            // Kısıt yok — uzunluğa göre tüm kelimeler
            candidates = (byLen[len] || []).filter(w => !usedEnglishWords.has(w.en));
        } else {
            // En küçük ön-filtrelenmiş seti bul
            let base = null;
            for (const [pos, ch] of constraints) {
                const set = (byLenPosChar[len]?.[pos]?.[ch]) || [];
                if (base === null || set.length < base.length) base = set;
            }
            // Tüm kısıtları karşılayan adayları filtrele
            candidates = (base || []).filter(w =>
                !usedEnglishWords.has(w.en) &&
                constraints.every(([pos, ch]) => w.en[pos] === ch)
            );
        }

        // Rastgele sırala
        shuffle(candidates);

        for (const wordObj of candidates) {
            const previousState = { ...gridLetters };
            for (let i = 0; i < len; i++) gridLetters[currentSlot.cells[i]] = wordObj.en[i];
            placedWords[currentSlot.id] = wordObj;
            usedEnglishWords.add(wordObj.en);

            const result = solve(slotIndex + 1);
            if (result === true) return true;
            if (result === "RESTART") return "RESTART";

            gridLetters = previousState;
            delete placedWords[currentSlot.id];
            usedEnglishWords.delete(wordObj.en);
        }
        return false;
    }

    let success = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 50;

    console.log(`[${dateString}] için bulmaca aranıyor...`);

    while (!success && attempts < MAX_ATTEMPTS) {
        attempts++;
        iterations = 0;
        gridLetters = {};
        placedWords = {};
        usedEnglishWords.clear();

        const result = solve(0);
        if (result === true) {
            success = true;
            console.log(`✅ Deneme ${attempts}: Kombinasyon bulundu!`);
        } else if (result === "RESTART") {
            console.log(`↩  Deneme ${attempts}: Tıkandı, yeniden başlatılıyor...`);
        } else {
            console.log(`✗  Deneme ${attempts}: Uygun kelime dizilimi bulunamadı.`);
        }
    }

    if (!success) {
        console.error("HATA: 50 denemede bulmaca üretilemedi.");
        return;
    }

    // ── JSON çıktısını oluştur ───────────────────────────────────
    let exportCells = [];
    let exportWords = {};
    let allLetters = [];

    // X hücrelerinin slot ID'lerini kolayca bulmak için harita
    // xSlotMap[cellId] = { rightId, downId }
    const xSlotMap = {};
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (template[y][x] === 'X') {
                const cellId = `${x}-${y}`;
                const slotR = slots.find(s => s.x === x && s.y === y && s.dir === 'right');
                const slotD = slots.find(s => s.x === x && s.y === y && s.dir === 'down');
                xSlotMap[cellId] = { rightId: slotR?.id, downId: slotD?.id };
            }
        }
    }

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const t = template[y][x];
            const cellId = `${x}-${y}`;

            if (t === 'B') {
                exportCells.push({ id: cellId, x, y, type: "empty" });

            } else if (t === 'R' || t === 'D') {
                const dir = t === 'R' ? 'right' : 'down';
                const slot = slots.find(s => s.x === x && s.y === y && s.dir === dir);
                const wordObj = placedWords[slot.id];
                exportCells.push({ id: cellId, x, y, type: "clue", dir, text: wordObj.tr, wordId: slot.id });
                exportWords[slot.id] = { en: wordObj.en, tr: wordObj.tr, length: slot.length, cells: slot.cells };

            } else if (t === 'X') {
                const { rightId, downId } = xSlotMap[cellId];
                const wordR = rightId ? placedWords[rightId] : null;
                const wordD = downId ? placedWords[downId] : null;

                exportCells.push({
                    id: cellId, x, y,
                    type: "clue",
                    dir: "both",
                    textRight: wordR?.tr ?? '',
                    wordIdRight: rightId ?? null,
                    textDown: wordD?.tr ?? '',
                    wordIdDown: downId ?? null,
                });

                if (rightId && wordR) exportWords[rightId] = { en: wordR.en, tr: wordR.tr, length: slots.find(s=>s.id===rightId).length, cells: slots.find(s=>s.id===rightId).cells };
                if (downId && wordD) exportWords[downId] = { en: wordD.en, tr: wordD.tr, length: slots.find(s=>s.id===downId).length, cells: slots.find(s=>s.id===downId).cells };

            } else if (t === 'L') {
                const letter = gridLetters[cellId];
                exportCells.push({ id: cellId, x, y, type: "letter", expected: letter });
                allLetters.push(letter);
            }
        }
    }

    const bCount = exportCells.filter(c => c.type === 'empty').length;
    console.log(`📊 Pasif (B) hücre sayısı: ${bCount} | Kelime sayısı: ${Object.keys(exportWords).length} | Şablon: ${templateIndex + 1}`);

    const puzzleOutput = {
        id: dateString,
        templateIndex: templateIndex + 1,
        grid: { cols: COLS, rows: ROWS },
        cells: exportCells,
        words: exportWords,
        letterPool: allLetters.sort(() => Math.random() - 0.5)
    };

    const dir = './public/puzzles';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(`${dir}/daily.json`, JSON.stringify(puzzleOutput, null, 2));

    // ── Geçmişe kaydet: bu günün kullanılan kelimeleri (tekrar önleme için) ──
    const usedEn = [...new Set(Object.values(exportWords).map(w => w.en))];
    history = history.filter(e => e && e.date !== dateString); // aynı gün tekrar üretilirse güncelle
    history.push({ date: dateString, words: usedEn });
    history = history.slice(-400);                              // çok eskiyenleri buda
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));

    console.log(`📚 Geçmişe ${usedEn.length} kelime kaydedildi (kayıtlı gün: ${history.length}).`);
    console.log(`\n🎉 BAŞARILI: ${dir}/daily.json üretildi! (Şablon ${templateIndex + 1})\n`);
}

// Tarihi sunucu saat diliminden bağımsız olarak İstanbul takvim gününe sabitle
// (her gece 00:00 TRT'de çalıştığında doğru günü verir)
const istanbulDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
generatePuzzle(istanbulDate);
