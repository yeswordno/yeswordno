import fs from 'fs';

// ─────────────────────────────────────────────────────────────────
// 1. SEVİYELER — her seviye farklı sözlük havuzundan beslenir.
//    Kademeli eşleme: havuzlar örtüşür, zorluk eğrisi yumuşaktır.
// ─────────────────────────────────────────────────────────────────
const DATA_DIR = './src/data';

const LEVELS = [
    { key: 'easy',   label: 'Kolay', files: ['a1_a2.json'] },
    { key: 'medium', label: 'Orta',  files: ['a1_a2.json', 'b1_b2.json'] },
    { key: 'hard',   label: 'Zor',   files: ['b1_b2.json', 'c1_c2.json', 'academic.json'] },
];

// KÖPRÜ KELİMELER — her seviyede bulunur (2 harfli X slotlarını doldurur, cooldown muaf).
// b1_b2/c1_c2/academic havuzlarında 2 harfli kelime yok; bunlar olmazsa "zor" tıkanır.
const FILLERS = [
    { tr: "ÜZERİNDE", en: "ON" }, { tr: "İÇİNDE", en: "IN" },
    { tr: "O (CANSIZ)", en: "IT" }, { tr: "YAPMAK", en: "DO" },
    { tr: "GİTMEK", en: "GO" }, { tr: "BİZ", en: "WE" },
    { tr: "TAMAM", en: "OK" }, { tr: "VEYA", en: "OR" },
    { tr: "YUKARI", en: "UP" }, { tr: "-DE / -DA", en: "AT" },
    { tr: "-E / -A (YÖN)", en: "TO" }, { tr: "OLMAK", en: "BE" },
    { tr: "-DIR / -DUR", en: "IS" }, { tr: "O (ERKEK)", en: "HE" },
    { tr: "BENİ / BANA", en: "ME" }, { tr: "BİZİ / BİZE", en: "US" },
    { tr: "EĞER", en: "IF" }, { tr: "BÖYLECE", en: "SO" },
    { tr: "GİBİ / OLARAK", en: "AS" }, { tr: "TARAFINDAN", en: "BY" },
    { tr: "BENİM", en: "MY" }, { tr: "HAYIR", en: "NO" },
    { tr: "SELAM", en: "HI" }, { tr: "AİT / -NİN", en: "OF" },
    { tr: "BİR (BELİRTEÇ)", en: "AN" }, { tr: "KİMLİK", en: "ID" },
    { tr: "TELEVİZYON", en: "TV" }
];

// Sözlük dosyalarını bir kez oku, önbelleğe al
const fileCache = {};
function loadFile(file) {
    if (fileCache[file]) return fileCache[file];
    const path = `${DATA_DIR}/${file}`;
    if (!fs.existsSync(path)) { console.log(`[-] ${file} bulunamadı, atlanıyor.`); return (fileCache[file] = []); }
    return (fileCache[file] = JSON.parse(fs.readFileSync(path, 'utf8')));
}

// Bir seviyenin sözlüğünü kur: formatla, element sembollerini ele,
// benzersizle (en bazında), köprü kelimeleri ekle.
function buildDictionary(files) {
    let raw = [];
    files.forEach(f => { raw = raw.concat(loadFile(f)); });
    const seen = new Set();
    const dict = [];
    raw
        .filter(item => !item._comment)
        .map(item => ({
            tr: item.tr.toLocaleUpperCase('tr-TR'),
            en: item.en.toUpperCase().replace(/[^A-Z]/g, '')
        }))
        .filter(item => item.en.length >= 1)
        // Element sembollerini ele ("CİVA SİMGESİ"=HG gibi teknik köprüler)
        .filter(item => !/SİMGES|SIMGES/i.test(item.tr))
        .forEach(w => { if (!seen.has(w.en)) { seen.add(w.en); dict.push(w); } });
    FILLERS.forEach(f => { if (!seen.has(f.en)) { seen.add(f.en); dict.push(f); } });
    return dict;
}

// ─────────────────────────────────────────────────────────────────
// 2. TEKRAR ÖNLEME — her seviye KENDİ geçmişiyle değerlendirilir.
//    (2 harfli köprüler muaf; eski/level'sız kayıtlar tüm seviyelere sayılır)
// ─────────────────────────────────────────────────────────────────
const COOLDOWN_DAYS = 60;                       // bu kadar gün aynı kelime tekrar çıkmaz
const HISTORY_PATH = './public/puzzles/history.json';

let history = [];
if (fs.existsSync(HISTORY_PATH)) {
    try { history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8')); }
    catch { history = []; }
}

function recentWordsForLevel(levelKey) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - COOLDOWN_DAYS);
    const recent = new Set();
    for (const entry of history) {
        if (!entry || !entry.date) continue;
        if (entry.level && entry.level !== levelKey) continue; // başka seviyenin kaydı → atla
        if (new Date(entry.date) >= cutoff) (entry.words || []).forEach(w => recent.add(w));
    }
    return recent;
}

// ─────────────────────────────────────────────────────────────────
// 3. 5 FARKLI ŞABLON
//    R  = Sağa soru  (clue, sağdaki L'ler bu kelimenin harfleri)
//    D  = Aşağı soru (clue, aşağıdaki L'ler bu kelimenin harfleri)
//    X  = Çift yön   (hem sağa HEM aşağı soru — tek kutucuk, 2 kelime)
//    L  = Harf kutusu
//    B  = Boş / pasif
//
// TASARIM KURALI: Her L hücresi hem yatay (sol'da R veya X) hem de
// dikey (üstte D veya X) olmak üzere ÇİFT yönden kapsanmalıdır.
// Validator bunu zorunlu kılar; tek yönlü L hücresine izin verilmez.
// ─────────────────────────────────────────────────────────────────
// NOT: Bu 5 şablon otomatik arama + çözülebilirlik testiyle seçildi.
// Hepsi: 0 orphan (kapsanmayan L yok), 1-harf slot yok, bitişik B yok,
// çift-kapsama %55-57 (eski zigzag %43 idi), çözüm oranı ~%85-97.
// Çift-kapsama = hem yatay hem dikey kelimenin geçtiği harf oranı;
// yüksek olması "soru bulunamayan/yalnız" hücre hissini azaltır.
const TEMPLATES = [

    // ── Şablon 1: çift-kapsama %57 | 46 harf | 18 kelime | çöz ~%97 ──
    [
        ['B', 'X', 'L', 'L', 'D', 'X', 'L', 'L'],
        ['R', 'L', 'L', 'L', 'L', 'L', 'L', 'L'],
        ['R', 'L', 'L', 'R', 'L', 'L', 'L', 'B'],
        ['R', 'L', 'L', 'X', 'L', 'L', 'L', 'D'],
        ['R', 'L', 'L', 'L', 'L', 'L', 'L', 'L'],
        ['R', 'L', 'L', 'L', 'L', 'L', 'L', 'L'],
        ['R', 'L', 'L', 'L', 'R', 'L', 'L', 'L'],
        ['R', 'L', 'L', 'L', 'R', 'L', 'L', 'B'],
    ],

    // ── Şablon 2: çift-kapsama %56 | 45 harf | 19 kelime | çöz ~%93 ──
    [
        ['B', 'X', 'L', 'L', 'D', 'X', 'L', 'L'],
        ['R', 'L', 'L', 'L', 'L', 'L', 'L', 'L'],
        ['R', 'L', 'L', 'X', 'L', 'L', 'L', 'B'],
        ['R', 'L', 'L', 'L', 'L', 'L', 'L', 'D'],
        ['R', 'L', 'L', 'L', 'L', 'X', 'L', 'L'],
        ['R', 'L', 'L', 'L', 'L', 'L', 'L', 'L'],
        ['R', 'L', 'L', 'L', 'R', 'L', 'L', 'L'],
        ['R', 'L', 'L', 'B', 'R', 'L', 'L', 'B'],
    ],

    // ── Şablon 3: çift-kapsama %56 | 45 harf | 19 kelime | çöz ~%90 ──
    [
        ['B', 'X', 'L', 'L', 'D', 'X', 'L', 'L'],
        ['R', 'L', 'L', 'L', 'L', 'L', 'L', 'L'],
        ['R', 'L', 'L', 'X', 'L', 'L', 'L', 'B'],
        ['R', 'L', 'L', 'L', 'L', 'L', 'L', 'D'],
        ['R', 'L', 'L', 'L', 'L', 'X', 'L', 'L'],
        ['R', 'L', 'L', 'L', 'L', 'L', 'L', 'L'],
        ['R', 'L', 'L', 'L', 'R', 'L', 'L', 'L'],
        ['B', 'R', 'L', 'L', 'R', 'L', 'L', 'B'],
    ],

    // ── Şablon 4: çift-kapsama %57 | 46 harf | 18 kelime | çöz ~%87 ──
    [
        ['B', 'X', 'L', 'L', 'D', 'X', 'L', 'L'],
        ['R', 'L', 'L', 'L', 'L', 'L', 'L', 'L'],
        ['R', 'L', 'L', 'X', 'L', 'L', 'L', 'B'],
        ['R', 'L', 'L', 'L', 'L', 'L', 'L', 'D'],
        ['R', 'L', 'L', 'L', 'L', 'L', 'L', 'L'],
        ['R', 'L', 'L', 'L', 'R', 'L', 'L', 'L'],
        ['R', 'L', 'L', 'L', 'R', 'L', 'L', 'L'],
        ['R', 'L', 'L', 'L', 'R', 'L', 'L', 'B'],
    ],

    // ── Şablon 5: çift-kapsama %55 | 44 harf | 20 kelime | çöz ~%87 ──
    [
        ['B', 'X', 'L', 'L', 'D', 'X', 'L', 'L'],
        ['R', 'L', 'L', 'L', 'L', 'L', 'L', 'L'],
        ['R', 'L', 'L', 'R', 'L', 'L', 'L', 'B'],
        ['R', 'L', 'L', 'X', 'L', 'L', 'L', 'D'],
        ['R', 'L', 'L', 'L', 'L', 'X', 'L', 'L'],
        ['R', 'L', 'L', 'L', 'L', 'L', 'L', 'L'],
        ['R', 'L', 'L', 'L', 'R', 'L', 'L', 'L'],
        ['R', 'L', 'L', 'B', 'R', 'L', 'L', 'B'],
    ],
];

// ─────────────────────────────────────────────────────────────────
// 4. ŞABLON DOĞRULAYICI
//    HATA (üretimi durdurur):
//      - Yan yana B
//      - ORPHAN L: ne yatay ne dikey hiçbir kelimeye ait olmayan harf
//        (kullanıcının şikâyet ettiği "sorusu olmayan kutucuk" durumu)
//      - 1-harf slot: bir kelimenin tek harften oluşması (geçersiz)
//    BİLGİ (sadece raporlanır, hata değil):
//      - Çift-kapsama oranı: hem yatay hem dikey kelimeye ait harf %'si.
//        Tek yönlü harfler normaldir (çengelde olağan), orphan DEĞİLDİR.
// ─────────────────────────────────────────────────────────────────
function validateTemplate(tmpl) {
    const ROWS = tmpl.length;
    const COLS = tmpl[0].length;
    const errors = [];
    let letters = 0, both = 0;

    // Yan yana B kontrolü
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (tmpl[y][x] === 'B') {
                if (x + 1 < COLS && tmpl[y][x + 1] === 'B') errors.push(`Yatay çift B: (${x},${y})-(${x+1},${y})`);
                if (y + 1 < ROWS && tmpl[y + 1][x] === 'B') errors.push(`Dikey çift B: (${x},${y})-(${x},${y+1})`);
            }
        }
    }

    // Her L hücresinin kapsamasını incele (orphan = hata, tek yön = OK)
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (tmpl[y][x] !== 'L') continue;
            letters++;
            let covH = false, covV = false;

            for (let cx = x - 1; cx >= 0; cx--) {
                const t = tmpl[y][cx];
                if (t === 'R' || t === 'X') { covH = true; break; }
                if (t !== 'L') break;
            }
            for (let cy = y - 1; cy >= 0; cy--) {
                const t = tmpl[cy][x];
                if (t === 'D' || t === 'X') { covV = true; break; }
                if (t !== 'L') break;
            }

            if (covH && covV) both++;
            if (!covH && !covV) errors.push(`ORPHAN (sorusu olmayan) hücre: (${x},${y})`);
        }
    }

    // 1-harf slot kontrolü (R/X sağında tek L, D/X altında tek L)
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const t = tmpl[y][x];
            if (t === 'R' || t === 'X') {
                let n = 0, cx = x + 1;
                while (cx < COLS && tmpl[y][cx] === 'L') { n++; cx++; }
                if (n === 1) errors.push(`1-harf yatay slot: (${x},${y})`);
            }
            if (t === 'D' || t === 'X') {
                let n = 0, cy = y + 1;
                while (cy < ROWS && tmpl[cy][x] === 'L') { n++; cy++; }
                if (n === 1) errors.push(`1-harf dikey slot: (${x},${y})`);
            }
        }
    }

    const pct = letters ? Math.round(100 * both / letters) : 0;
    return { errors, letters, pct };
}

// Başlangıçta tüm şablonları doğrula + çift-kapsama raporla
TEMPLATES.forEach((tmpl, i) => {
    const { errors, letters, pct } = validateTemplate(tmpl);
    if (errors.length > 0) {
        console.error(`\n⚠️  Şablon ${i + 1} hatalı:`);
        errors.forEach(e => console.error('   ' + e));
        process.exit(1);
    }
    console.log(`   Şablon ${i + 1}: ${letters} harf, çift-kapsama %${pct} ✓`);
});
console.log(`✅ Tüm ${TEMPLATES.length} şablon doğrulandı.\n`);

// ─────────────────────────────────────────────────────────────────
// 5. YARDIMCI: Fisher-Yates karıştırma (yerinde, tarafsız)
// ─────────────────────────────────────────────────────────────────
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ─────────────────────────────────────────────────────────────────
// 6. BULMACA ÜRETİCİ — bir seviye için bir günlük bulmaca üretir.
//    Dönüş: kullanılan İngilizce kelimeler (history için) | null (başarısız)
// ─────────────────────────────────────────────────────────────────
function generatePuzzle(dateString, level) {
    // Bu seviyenin sözlüğü + cooldown filtresi (2 harfli köprüler muaf)
    const recent = recentWordsForLevel(level.key);
    const fullDict = buildDictionary(level.files);
    const dictionary = fullDict.filter(w => w.en.length <= 2 || !recent.has(w.en));
    console.log(`[${level.label}] sözlük: ${fullDict.length} → cooldown sonrası ${dictionary.length} (son ${COOLDOWN_DAYS} günde ${recent.size} kelime kullanılmış)`);

    // Pozisyon indeksi (bu seviyeye özel): byLenPosChar[len][pos][char] = kelime[]
    const byLen = {};
    const byLenPosChar = {};
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

    // Şablon + slotlar HER DENEMEDE yeniden seçilir. Böylece bir şablon bu
    // seviyenin sözlüğüyle tıkansa bile diğer şablonlar denenir (özellikle
    // "zor"da bazı şablonlar dar sözlükle çözülemiyor; tek şablona kilitlenmeyelim).
    let templateIndex, template, ROWS, COLS, slots;
    function pickTemplate() {
        templateIndex = Math.floor(Math.random() * TEMPLATES.length);
        template = TEMPLATES[templateIndex];
        ROWS = template.length;
        COLS = template[0].length;
        slots = [];
        let slotId = 1;
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                const t = template[y][x];
                if (t === 'R' || t === 'X') {
                    let cells = [], cx = x + 1;
                    while (cx < COLS && template[y][cx] === 'L') { cells.push(`${cx}-${y}`); cx++; }
                    if (cells.length > 0) slots.push({ id: `w${slotId++}`, dir: 'right', x, y, length: cells.length, cells });
                }
                if (t === 'D' || t === 'X') {
                    let cells = [], cy = y + 1;
                    while (cy < ROWS && template[cy][x] === 'L') { cells.push(`${x}-${cy}`); cy++; }
                    if (cells.length > 0) slots.push({ id: `w${slotId++}`, dir: 'down', x, y, length: cells.length, cells });
                }
            }
        }
        // Uzun kelimeler önce yerleştirilsin (daha az backtrack)
        slots.sort((a, b) => b.length - a.length);
    }

    let gridLetters = {};
    let placedWords = {};
    let usedEnglishWords = new Set();

    let iterations = 0;
    const MAX_ITERATIONS = 300000;

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
        pickTemplate();              // her denemede yeni şablon
        iterations = 0;
        gridLetters = {};
        placedWords = {};
        usedEnglishWords.clear();

        const result = solve(0);
        if (result === true) {
            success = true;
            console.log(`✅ Deneme ${attempts}: Şablon ${templateIndex + 1} ile bulundu!`);
        } else if (result === "RESTART") {
            console.log(`↩  Deneme ${attempts}: Şablon ${templateIndex + 1} tıkandı, yeniden...`);
        } else {
            console.log(`✗  Deneme ${attempts}: Şablon ${templateIndex + 1} uygun dizilim yok.`);
        }
    }

    if (!success) {
        console.error(`HATA: ${MAX_ATTEMPTS} denemede bulmaca üretilemedi.`);
        return null;
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
        level: level.key,
        templateIndex: templateIndex + 1,
        grid: { cols: COLS, rows: ROWS },
        cells: exportCells,
        words: exportWords,
        letterPool: shuffle(allLetters)
    };

    const dir = './public/puzzles';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(`${dir}/daily-${level.key}.json`, JSON.stringify(puzzleOutput, null, 2));
    // Geriye dönük uyumluluk: eski tek-mod istemciler için medium = daily.json
    if (level.key === 'medium') {
        fs.writeFileSync(`${dir}/daily.json`, JSON.stringify(puzzleOutput, null, 2));
    }

    const usedEn = [...new Set(Object.values(exportWords).map(w => w.en))];
    console.log(`🎉 [${level.label}] daily-${level.key}.json üretildi (Şablon ${templateIndex + 1}, ${usedEn.length} kelime).\n`);
    return usedEn;
}

// ─────────────────────────────────────────────────────────────────
// 7. TÜM SEVİYELERİ ÜRET
// ─────────────────────────────────────────────────────────────────
// Tarihi İstanbul takvim gününe sabitle (gece 00:00 TRT'de doğru gün)
const istanbulDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
console.log(`\n📅 ${istanbulDate} — ${LEVELS.length} seviye üretiliyor...\n`);

let okCount = 0;
for (const level of LEVELS) {
    console.log(`───── ${level.label.toUpperCase()} (${level.key}) ─────`);
    const usedEn = generatePuzzle(istanbulDate, level);
    if (usedEn) {
        okCount++;
        // Aynı gün+seviye yeniden üretilirse kaydı güncelle
        history = history.filter(e => !(e && e.date === istanbulDate && e.level === level.key));
        history.push({ date: istanbulDate, level: level.key, words: usedEn });
    } else {
        console.error(`⚠️  ${level.label} üretilemedi!`);
    }
}

history = history.slice(-1200);  // 3 seviye × ~60 gün cooldown için bolca pay
fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
console.log(`✅ ${okCount}/${LEVELS.length} seviye üretildi. Geçmiş: ${history.length} kayıt.\n`);

if (okCount < LEVELS.length) process.exit(1);
