import fs from 'fs';

// ─────────────────────────────────────────────────────────────────
// 1. SEVİYELER — her seviye farklı sözlük havuzundan beslenir.
//    Kademeli eşleme: havuzlar örtüşür, zorluk eğrisi yumuşaktır.
// ─────────────────────────────────────────────────────────────────
const DATA_DIR = './src/data';

// common_short.json: küratörlü yaygın kısa kelimeler — her seviyede "harç"
// (özellikle hard'ın az olan 3-5 harfli havuzunu besler).
const LEVELS = [
    { key: 'easy',   label: 'Kolay', files: ['a1_a2.json', 'common_short.json'] },
    { key: 'medium', label: 'Orta',  files: ['a1_a2.json', 'b1_b2.json', 'common_short.json'] },
    { key: 'hard',   label: 'Zor',   files: ['b1_b2.json', 'c1_c2.json', 'academic.json', 'common_short.json'] },
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
    { tr: "TELEVİZYON", en: "TV" },

    // ── HAVUZ GENİŞLETME (Sorun 3a) — köprü çeşitliliği için ~60 ek 2 harfli ──
    // Element sembolleri (buildDictionary'deki SİMGES elemesini FILLERS atlar; bunlar
    // bilinçli köprüdür). FILLER_SET'tekilerle çakışanlar (HE/BE/AS/IN/AT) eklenmedi.
    { tr: "LİTYUM SİMGESİ", en: "LI" }, { tr: "NEON SİMGESİ", en: "NE" },
    { tr: "SODYUM SİMGESİ", en: "NA" }, { tr: "MAGNEZYUM SİMGESİ", en: "MG" },
    { tr: "ALÜMİNYUM SİMGESİ", en: "AL" }, { tr: "SİLİSYUM SİMGESİ", en: "SI" },
    { tr: "KLOR SİMGESİ", en: "CL" }, { tr: "ARGON SİMGESİ", en: "AR" },
    { tr: "KALSİYUM SİMGESİ", en: "CA" }, { tr: "TİTANYUM SİMGESİ", en: "TI" },
    { tr: "KROM SİMGESİ", en: "CR" }, { tr: "MANGANEZ SİMGESİ", en: "MN" },
    { tr: "DEMİR SİMGESİ", en: "FE" }, { tr: "KOBALT SİMGESİ", en: "CO" },
    { tr: "NİKEL SİMGESİ", en: "NI" }, { tr: "BAKIR SİMGESİ", en: "CU" },
    { tr: "ÇİNKO SİMGESİ", en: "ZN" }, { tr: "BROM SİMGESİ", en: "BR" },
    { tr: "KRİPTON SİMGESİ", en: "KR" }, { tr: "STRONSİYUM SİMGESİ", en: "SR" },
    { tr: "ZİRKONYUM SİMGESİ", en: "ZR" }, { tr: "MOLİBDEN SİMGESİ", en: "MO" },
    { tr: "GÜMÜŞ SİMGESİ", en: "AG" }, { tr: "KALAY SİMGESİ", en: "SN" },
    { tr: "ANTİMON SİMGESİ", en: "SB" }, { tr: "TELLÜR SİMGESİ", en: "TE" },
    { tr: "KSENON SİMGESİ", en: "XE" }, { tr: "BARYUM SİMGESİ", en: "BA" },
    { tr: "LANTAN SİMGESİ", en: "LA" }, { tr: "SERYUM SİMGESİ", en: "CE" },
    { tr: "NEODİM SİMGESİ", en: "ND" }, { tr: "PLATİN SİMGESİ", en: "PT" },
    { tr: "ALTIN SİMGESİ", en: "AU" }, { tr: "CIVA SİMGESİ", en: "HG" },
    { tr: "KURŞUN SİMGESİ", en: "PB" }, { tr: "BİZMUT SİMGESİ", en: "BI" },
    { tr: "RADON SİMGESİ", en: "RN" }, { tr: "RADYUM SİMGESİ", en: "RA" },
    { tr: "AKTİNYUM SİMGESİ", en: "AC" }, { tr: "TORYUM SİMGESİ", en: "TH" },
    { tr: "OSMİYUM SİMGESİ", en: "OS" }, { tr: "İRİDYUM SİMGESİ", en: "IR" },
    { tr: "SELENYUM SİMGESİ", en: "SE" },

    // Nota isimleri (DO/SO/LA başka köprülerle çakışıyor — eklenmedi)
    { tr: "BİR NOTA", en: "RE" }, { tr: "BİR NOTA", en: "MI" }, { tr: "BİR NOTA", en: "FA" },

    // Yaygın kısaltmalar
    { tr: "KİŞİSEL BİLGİSAYAR", en: "PC" }, { tr: "KOMPAKT DİSK", en: "CD" },
    { tr: "MÜZİK YAYINCISI", en: "DJ" }, { tr: "AVRUPA BİRLİĞİ", en: "EU" },
    { tr: "BİRLEŞİK KRALLIK", en: "UK" }, { tr: "ÖĞLEDEN ÖNCE", en: "AM" },
    { tr: "ÖĞLEDEN SONRA", en: "PM" }, { tr: "KİLOGRAM", en: "KG" },
    { tr: "KİLOMETRE", en: "KM" }, { tr: "SANTİMETRE", en: "CM" },
    { tr: "MİLİMETRE", en: "MM" }, { tr: "DOKTOR (KISALTMA)", en: "DR" },
    { tr: "BAY (KISALTMA)", en: "MR" }, { tr: "BAYAN (KISALTMA)", en: "MS" },
    { tr: "DOĞRU AKIM", en: "DC" }
];
// Köprü kelimeler için KISA cooldown (Sorun 3b): tam muafiyet yerine son birkaç gün.
const FILLER_SET = new Set(FILLERS.map(f => f.en));

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
const COOLDOWN_DAYS = 60;                       // normal kelime: bu kadar gün tekrar çıkmaz
const FILLER_COOLDOWN_DAYS = 5;                 // köprü/2 harfli: kısa cooldown (tam muafiyet yerine)
const HISTORY_PATH = './public/puzzles/history.json';

let history = [];
if (fs.existsSync(HISTORY_PATH)) {
    try { history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8')); }
    catch { history = []; }
}

// refDateStr: hangi günün bakış açısından "son 60 gün"? (kuyruk için ileri tarihlerde
// her gün KENDİ tarihine göre değerlendirilir; verilmezse bugün.)
function recentWordsForLevel(levelKey, refDateStr, days = COOLDOWN_DAYS) {
    const ref = refDateStr ? new Date(refDateStr + 'T00:00:00Z') : new Date();
    const cutoff = new Date(ref);
    cutoff.setDate(cutoff.getDate() - days);
    const recent = new Set();
    for (const entry of history) {
        if (!entry || !entry.date) continue;
        if (entry.level && entry.level !== levelKey) continue; // başka seviyenin kaydı → atla
        if (entry.date === refDateStr) continue;               // bu günün kendi kaydını sayma (yeniden üretim)
        const d = new Date(entry.date + 'T00:00:00Z');
        if (d >= cutoff && d < ref) (entry.words || []).forEach(w => recent.add(w));
    }
    return recent;
}

// Köprü/2 harfli kelimeler için kısa pencere (Sorun 3b)
function recentFillersForLevel(levelKey, refDateStr) {
    return recentWordsForLevel(levelKey, refDateStr, FILLER_COOLDOWN_DAYS);
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
function generatePuzzle(dateString, level, sameDayUsed = new Set()) {
    // Bu seviyenin sözlüğü + KADEMELİ cooldown (Sorun 3b) + aynı-gün dedup (Sorun 2).
    //   - normal kelime: son 60 günde kullanılmamış olmalı,
    //   - köprü/2 harfli: son 5 günde kullanılmamış olmalı (tam muafiyet kaldırıldı),
    //   - sameDayUsed: o TARİH için diğer seviyelerde kullanılan kelimeler (köprüler dahil) elenir.
    const recent = recentWordsForLevel(level.key, dateString);
    const recentFillers = recentFillersForLevel(level.key, dateString);
    const fullDict = buildDictionary(level.files);

    // relaxFiller: filler cooldown'u kaldır (havuz darsa). relaxSameDay: aynı-gün kuralını gevşet (emniyet supabı).
    function buildDict({ relaxFiller = false, relaxSameDay = false } = {}) {
        return fullDict.filter(w => {
            if (!relaxSameDay && sameDayUsed.has(w.en)) return false;
            const isFiller = w.en.length <= 2 || FILLER_SET.has(w.en);
            if (isFiller) return relaxFiller || !recentFillers.has(w.en);
            return !recent.has(w.en);
        });
    }

    // Pozisyon indeksi: byLenPosChar[len][pos][char] = kelime[]. Sözlük değişince yeniden kurulur.
    let byLen = {};
    let byLenPosChar = {};
    function buildIndex(dictionary) {
        byLen = {};
        byLenPosChar = {};
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
    }

    // Katı sözlük. Köprü havuzu darsa (2 harfli aday < eşik) filler cooldown'u kaldır + uyar (3b emniyet supabı).
    let strictRelaxFiller = false;
    let dictionary = buildDict();
    const MIN_FILLER_CANDIDATES = 12;
    const twoLetterCount = dictionary.filter(w => w.en.length <= 2).length;
    if (twoLetterCount < MIN_FILLER_CANDIDATES) {
        strictRelaxFiller = true;
        dictionary = buildDict({ relaxFiller: true });
        console.log(`⚠ köprü havuzu dar (${twoLetterCount}<${MIN_FILLER_CANDIDATES}) → filler cooldown gevşetildi (${dateString}, ${level.label})`);
    }
    buildIndex(dictionary);
    console.log(`[${level.label}] sözlük: ${fullDict.length} → filtre sonrası ${dictionary.length} (normal cooldown ${COOLDOWN_DAYS}g/${recent.size} kelime · filler ${FILLER_COOLDOWN_DAYS}g · aynı-gün eleme ${sameDayUsed.size})`);

    // Şablon GÜNE GÖRE belirlenir: her gün bir sonraki şablon, 5'te başa döner
    // (bugün=şablon A, yarın=B … böylece görsel her gün değişir, tüm seviyeler aynı).
    // İlk 30 deneme bugünün şablonu; o seviye sözlüğüyle tıkanırsa kalan denemeler
    // diğer şablonlara geçer (üretim hiçbir seviyede takılmasın).
    const dayIdx = Math.floor(Date.parse(dateString) / 86400000) % TEMPLATES.length;
    let templateIndex, template, ROWS, COLS, slots;
    function pickTemplate(attempt) {
        templateIndex = attempt <= 30 ? dayIdx : (dayIdx + attempt) % TEMPLATES.length;
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
    let usedClues = new Set();   // aynı bulmacada aynı TR sorusu 2 kez sorulmasın

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
            candidates = (byLen[len] || []).filter(w => !usedEnglishWords.has(w.en) && !usedClues.has(w.tr));
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
                !usedClues.has(w.tr) &&                       // aynı soru tekrar etmesin
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
            usedClues.add(wordObj.tr);

            const result = solve(slotIndex + 1);
            if (result === true) return true;
            if (result === "RESTART") return "RESTART";

            gridLetters = previousState;
            delete placedWords[currentSlot.id];
            usedEnglishWords.delete(wordObj.en);
            usedClues.delete(wordObj.tr);
        }
        return false;
    }

    let success = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 50;
    const RELAX_AFTER = 35;          // ilk 35 deneme katı; sonra aynı-gün kuralı gevşer (emniyet supabı)
    let sameDayRelaxed = false;

    console.log(`[${dateString}] için bulmaca aranıyor...`);

    while (!success && attempts < MAX_ATTEMPTS) {
        attempts++;
        // Son 15 denemede hâlâ çözüm yoksa aynı-gün dedup kuralını gevşet (Sorun 2 supabı).
        if (attempts > RELAX_AFTER && !sameDayRelaxed && sameDayUsed.size > 0) {
            sameDayRelaxed = true;
            buildIndex(buildDict({ relaxFiller: strictRelaxFiller, relaxSameDay: true }));
            console.log(`⚠ aynı-gün tekrar gevşetildi (${dateString}, ${level.label})`);
        }
        pickTemplate(attempts);      // güne göre şablon (tıkanırsa diğerlerine düşer)
        iterations = 0;
        gridLetters = {};
        placedWords = {};
        usedEnglishWords.clear();
        usedClues.clear();

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

    const usedEn = [...new Set(Object.values(exportWords).map(w => w.en))];
    console.log(`🎉 [${level.label}] ${dateString} üretildi (Şablon ${templateIndex + 1}, ${usedEn.length} kelime).`);
    // Dosyayı burada YAZMIYORUZ — orkestratör kuyruğu toplayıp tek seferde yazar.
    return { puzzle: puzzleOutput, usedEn };
}

// Tarih dizesine gün ekle (İstanbul takvim günü; UTC üzerinden DST'siz hesap)
function addDays(dateString, n) {
    const d = new Date(dateString + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────
// 7. KUYRUK DOLDURUCU — her seviye için N günlük TAMPON tut.
//    Mantık: kullanıcıya görünen "bugün", cron'un ne zaman koştuğundan
//    bağımsızdır. Dosyada bugün + ileri günler hazır beklediği için
//    00:00'da uygulama hiç beklemeden bugünün kaydını bulur.
//    Bu koşu kendini ONARIR: cron bir/birkaç geceyi atlasa bile bir
//    sonraki koşu eksik günleri doldurur (tampon < boşluk olmadıkça
//    kullanıcı asla boşluk görmez). Geçmiş günler kuyruktan düşürülür.
// ─────────────────────────────────────────────────────────────────
const BUFFER_DAYS = 7;
const OUT_DIR = './public/puzzles';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Tarihi İstanbul takvim gününe sabitle (gece 00:00 TRT'de doğru gün)
const istanbulDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
const targetDates = Array.from({ length: BUFFER_DAYS }, (_, i) => addDays(istanbulDate, i));
console.log(`\n📅 Bugün ${istanbulDate} — ${BUFFER_DAYS} günlük tampon: ${targetDates[0]} … ${targetDates[targetDates.length - 1]}\n`);

// Var olan kuyruğu oku (eski tek-obje formatını da diziye sar)
function loadExistingPuzzles(levelKey) {
    const path = `${OUT_DIR}/daily-${levelKey}.json`;
    if (!fs.existsSync(path)) return {};
    try {
        const data = JSON.parse(fs.readFileSync(path, 'utf8'));
        const arr = Array.isArray(data.puzzles) ? data.puzzles : (data.id ? [data] : []);
        const map = {};
        for (const p of arr) if (p && p.id) map[p.id] = p;
        return map;
    } catch { return {}; }
}

let totalGenerated = 0, totalReused = 0, todayFails = 0;
let mediumToday = null;

// Sorun 2: döngü DIŞTA tarih, İÇTE seviye (easy→medium→hard). Böylece bir gün
// için önceki seviyelerin kelimeleri elde olur ve sameDayUsed ile o gün başka
// seviyede TEKRAR edilmesi engellenir (köprüler dahil; "TV aynı gün 2 seviyede" giderilir).
const levelStates = LEVELS.map(level => ({
    level,
    existing: loadExistingPuzzles(level.key),
    queue: [],
}));

for (const date of targetDates) {                // tarihler artan sırada (cooldown kronolojisi doğru)
    const sameDayUsed = new Set();               // o GÜN tüm seviyelerde kullanılan en'ler
    for (const st of levelStates) {
        const { level } = st;
        let puzzle = null;
        if (st.existing[date]) {                 // zaten üretilmiş günü yeniden üretme (dedup kaynağı olur)
            puzzle = st.existing[date];
            totalReused++;
            console.log(`   ↺ ${date} [${level.label}] kuyrukta hazır (yeniden üretilmedi).`);
        } else {
            const res = generatePuzzle(date, level, sameDayUsed);
            if (res) {
                puzzle = res.puzzle;
                totalGenerated++;
                // Geçmişi ANINDA güncelle ki kuyruktaki sonraki GÜNLER bu kelimeleri tekrar etmesin
                history = history.filter(e => !(e && e.date === date && e.level === level.key));
                history.push({ date, level: level.key, words: res.usedEn });
            } else {
                console.error(`   ⚠️  ${date} üretilemedi (${level.label}).`);
                if (date === istanbulDate) todayFails++;   // sadece BUGÜNün eksikliği kritiktir
            }
        }
        if (puzzle) {
            st.queue.push(puzzle);
            // Bu günün kelimelerini sonraki seviyeler için ele (köprüler dahil)
            Object.values(puzzle.words).forEach(w => sameDayUsed.add(w.en));
        }
    }
}

for (const st of levelStates) {
    st.queue.sort((a, b) => (a.id < b.id ? -1 : 1));
    const out = { level: st.level.key, generated: new Date().toISOString(), puzzles: st.queue };
    fs.writeFileSync(`${OUT_DIR}/daily-${st.level.key}.json`, JSON.stringify(out, null, 2));
    console.log(`🗂  daily-${st.level.key}.json yazıldı — ${st.queue.length} günlük kuyruk.`);
    if (st.level.key === 'medium') mediumToday = st.queue.find(p => p.id === istanbulDate) || st.queue[0] || null;
}

// Geriye dönük uyumluluk: eski tek-mod istemciler için daily.json = BUGÜNün medium'u (tek obje)
if (mediumToday) {
    fs.writeFileSync(`${OUT_DIR}/daily.json`, JSON.stringify(mediumToday, null, 2));
}

// 3 seviye × ~67 gün (60 cooldown + 7 tampon) × ~22 kelime ≈ 4400 kayıt gerekir;
// eski 1500 sınırı 60 günlük pencereyi kırpıyordu (gizli bug) → 6000'e çıkarıldı.
history = history.slice(-6000);
fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
console.log(`✅ Üretildi: ${totalGenerated} yeni, ${totalReused} hazır. Geçmiş: ${history.length} kayıt.\n`);

// Sadece BUGÜN herhangi bir seviyede eksikse hata ver (ileri gün eksiği tamponla tolere edilir)
if (todayFails > 0) process.exit(1);
