// src/DuelGame.jsx — CrossUp v6  (Günlük Bulmaca)
import { useState, useEffect, useRef } from 'react';
import './DuelGame.css';

import a1_a2   from './data/a1_a2.json';
import b1_b2   from './data/b1_b2.json';
import c1_c2   from './data/c1_c2.json';
import academic from './data/academic.json';

/* ═══════════════════════════════════════════════════════
   ÖZEL KELİME BANKASI
   Tek harfler · Element simgeleri · Kısaltmalar · Kısa kelimeler
   ═══════════════════════════════════════════════════════ */
const SPECIALS = [
  /* --- Kimyasal element simgeleri --- */
  { en:'HE', tr:'Helyum simgesi' },
  { en:'LI', tr:'Lityum simgesi' },
  { en:'NE', tr:'Neon simgesi' },
  { en:'NA', tr:'Sodyum simgesi' },
  { en:'MG', tr:'Magnezyum simgesi' },
  { en:'AL', tr:'Alüminyum simgesi' },
  { en:'SI', tr:'Silisyum simgesi' },
  { en:'CL', tr:'Klor simgesi' },
  { en:'CA', tr:'Kalsiyum simgesi' },
  { en:'FE', tr:'Demir simgesi' },
  { en:'CU', tr:'Bakır simgesi' },
  { en:'ZN', tr:'Çinko simgesi' },
  { en:'AG', tr:'Gümüş simgesi' },
  { en:'AU', tr:'Altın simgesi' },
  { en:'HG', tr:'Cıva simgesi' },
  { en:'PB', tr:'Kurşun simgesi' },
  { en:'TI', tr:'Titanyum simgesi' },
  { en:'CO', tr:'Kobalt simgesi' },
  { en:'NI', tr:'Nikel simgesi' },
  { en:'BR', tr:'Brom simgesi' },
  { en:'KR', tr:'Kripton simgesi' },
  { en:'SR', tr:'Stronsiyum simgesi' },
  { en:'MO', tr:'Molibden simgesi' },
  { en:'CD', tr:'Kadmiyum simgesi' },
  { en:'SN', tr:'Kalay simgesi' },
  { en:'BA', tr:'Baryum simgesi' },
  { en:'PT', tr:'Platin simgesi' },
  { en:'CR', tr:'Krom simgesi' },
  { en:'MN', tr:'Mangan simgesi' },
  { en:'AS', tr:'Arsenik simgesi' },
  { en:'SE', tr:'Selenyum simgesi' },
  { en:'RB', tr:'Rubidyum simgesi' },
  { en:'ZR', tr:'Zirkonyum simgesi' },
  { en:'NB', tr:'Niyobyum simgesi' },
  { en:'TC', tr:'Teknetyum simgesi' },
  { en:'RU', tr:'Rutenyum simgesi' },
  { en:'RH', tr:'Rodyum simgesi' },
  { en:'PD', tr:'Paladyum simgesi' },
  { en:'IN', tr:'İndiyum simgesi' },
  { en:'SB', tr:'Antimon simgesi' },
  { en:'TE', tr:'Tellür simgesi' },
  { en:'CS', tr:'Sezyum simgesi' },
  { en:'LA', tr:'Lantan simgesi' },
  { en:'CE', tr:'Seryum simgesi' },
  { en:'PR', tr:'Praseodim simgesi' },
  { en:'ND', tr:'Neodim simgesi' },
  { en:'SM', tr:'Samaryum simgesi' },
  { en:'EU', tr:'Europiyum simgesi' },
  { en:'GD', tr:'Gadolinyum simgesi' },
  { en:'TB', tr:'Terbiyum simgesi' },
  { en:'DY', tr:'Disprosyum simgesi' },
  { en:'HO', tr:'Holmiyum simgesi' },
  { en:'ER', tr:'Erbiyum simgesi' },
  { en:'TM', tr:'Tulyum simgesi' },
  { en:'YB', tr:'Yterbiyum simgesi' },
  { en:'LU', tr:'Lutesyum simgesi' },
  { en:'HF', tr:'Hafniyum simgesi' },
  { en:'TA', tr:'Tantal simgesi' },
  { en:'RE', tr:'Renyum simgesi' },
  { en:'OS', tr:'Osmiyum simgesi' },
  { en:'IR', tr:'İridyum simgesi' },
  { en:'BI', tr:'Bizmut simgesi' },
  { en:'PO', tr:'Polonyum simgesi' },
  { en:'AT', tr:'Astat simgesi' },
  { en:'FR', tr:'Fransiyum simgesi' },
  { en:'RA', tr:'Radyum simgesi' },
  { en:'AC', tr:'Aktinyum simgesi' },
  { en:'TH', tr:'Toryum simgesi' },
  { en:'PA', tr:'Protaktinyum simgesi' },
  { en:'NP', tr:'Neptünyum simgesi' },
  { en:'PU', tr:'Plütonyum simgesi' },
  { en:'AM', tr:'Amerikyum simgesi' },
  { en:'CM', tr:'Küryum simgesi' },
  { en:'CF', tr:'Kaliforniyum simgesi' },
  { en:'RF', tr:'Rutherfordyum simgesi' },
  { en:'DB', tr:'Dubniyum simgesi' },
  { en:'SG', tr:'Seaborgiyum simgesi' },
  { en:'BH', tr:'Bohryum simgesi' },
  { en:'HS', tr:'Hassiyum simgesi' },

  /* --- Kısaltmalar --- */
  { en:'AI',  tr:'Yapay zeka kısaltması' },
  { en:'IQ',  tr:'Zeka katsayısı' },
  { en:'TV',  tr:'Televizyon kısaltması' },
  { en:'ID',  tr:'Kimlik kısaltması' },
  { en:'OK',  tr:'Onay kelimesi' },
  { en:'VR',  tr:'Sanal gerçeklik' },
  { en:'DJ',  tr:'Disk jokey' },
  { en:'HR',  tr:'İnsan kaynakları' },
  { en:'IT',  tr:'Bilgi teknolojileri' },
  { en:'HQ',  tr:'Genel merkez kısaltması' },
  { en:'DNA', tr:'Genetik şifre kısaltması' },
  { en:'SOS', tr:'Acil yardım sinyali' },
  { en:'VIP', tr:'Çok önemli kişi' },
  { en:'GPS', tr:'Konum sistemi kısaltması' },
  { en:'ATM', tr:'Para çekme makinesi' },
  { en:'PIN', tr:'Gizli kişisel kod' },
  { en:'UFO', tr:'Tanımlanamayan uçan nesne' },
  { en:'USB', tr:'Bilgisayar bağlantı türü' },
  { en:'RAM', tr:'Geçici bellek türü' },
  { en:'CPU', tr:'İşlemci kısaltması' },
  { en:'URL', tr:'İnternet adresi türü' },
  { en:'PDF', tr:'Belge formatı kısaltması' },
  { en:'GYM', tr:'Spor salonu (kısa)' },
  { en:'APP', tr:'Uygulama kısaltması' },
  { en:'IRL', tr:'Gerçek hayat kısaltması' },
  { en:'IVY', tr:'Sarmaşık bitkisi' },
  { en:'SIM', tr:'Telefon çip kartı' },
  { en:'API', tr:'Yazılım arayüzü kısaltması' },
  { en:'ETA', tr:'Tahmini varış zamanı' },
  { en:'RIP', tr:'Huzur içinde yatsın' },
  { en:'FAQ', tr:'Sık sorulan sorular' },
  { en:'POV', tr:'Bakış açısı kısaltması' },
  { en:'TBD', tr:'Belirlenecek kısaltması' },
  { en:'ASAP',tr:'En kısa sürede kısaltması' },

  /* --- Kısa İngilizce kelimeler --- */
  { en:'GO',  tr:'Gitmek' },
  { en:'DO',  tr:'Yapmak' },
  { en:'BE',  tr:'Olmak (fiil)' },
  { en:'ON',  tr:'Üzerinde' },
  { en:'BY',  tr:'Yanında/ile' },
  { en:'OF',  tr:'-nın/-nin' },
  { en:'OR',  tr:'Veya' },
  { en:'SO',  tr:'Böylece/çok' },
  { en:'UP',  tr:'Yukarı' },
  { en:'WE',  tr:'Biz zamiri' },
  { en:'MY',  tr:'Benim zamiri' },
  { en:'NO',  tr:'Hayır' },
  { en:'HI',  tr:'Merhaba (kısa)' },
  { en:'ME',  tr:'Beni zamiri' },
  { en:'US',  tr:'Bizi zamiri' },
  { en:'TO',  tr:'-e/-a yönelme' },
  { en:'PI',  tr:'Daire sabiti 3.14' },
  { en:'EGO', tr:'Benlik/ego' },
  { en:'ERA', tr:'Çağ veya dönem' },
  { en:'OAK', tr:'Meşe ağacı' },
  { en:'OAR', tr:'Sandal küreği' },
  { en:'ORE', tr:'Maden cevheri' },
  { en:'OWE', tr:'Borçlu olmak' },
  { en:'OWL', tr:'Baykuş' },
  { en:'OWN', tr:'Sahip olmak' },
  { en:'ICE', tr:'Buz' },
  { en:'ION', tr:'Yüklü atom' },
  { en:'AGO', tr:'Önce (zaman için)' },
  { en:'AID', tr:'Yardım' },
  { en:'AIM', tr:'Hedef koymak' },
  { en:'AIR', tr:'Hava' },
  { en:'APE', tr:'Büyük maymun' },
  { en:'ARC', tr:'Yay/ark şekli' },
  { en:'ARM', tr:'Kol (vücut)' },
  { en:'ART', tr:'Sanat' },
  { en:'ASH', tr:'Kül' },
  { en:'ASK', tr:'Sormak' },
  { en:'AWE', tr:'Derin hayranlık' },
  { en:'AXE', tr:'Balta aleti' },
  { en:'ANT', tr:'Karınca' },
  { en:'BEE', tr:'Arı' },
  { en:'COW', tr:'İnek' },
  { en:'FOX', tr:'Tilki' },
  { en:'HEN', tr:'Dişi tavuk' },
  { en:'JAY', tr:'Alakarga kuşu' },
  { en:'PIG', tr:'Domuz' },
  { en:'RAT', tr:'Sıçan' },
  { en:'YAK', tr:'Tibet öküzü' },
  { en:'EMU', tr:'Dev Avustralya kuşu' },
  { en:'EEL', tr:'Yılanbalığı' },
  { en:'EWE', tr:'Dişi koyun' },
  { en:'GNU', tr:'Afrika antilobu' },
  { en:'JAB', tr:'Hızlı yumruk' },
  { en:'JAM', tr:'Reçel' },
  { en:'JAR', tr:'Cam kavanoz' },
  { en:'JET', tr:'Jet uçağı' },
  { en:'JOB', tr:'İş/görev' },
  { en:'JOG', tr:'Yavaş koşu' },
  { en:'JOY', tr:'Sevinç' },
  { en:'JUG', tr:'Sürahi' },
  { en:'KEG', tr:'Küçük fıçı' },
  { en:'KID', tr:'Çocuk/şaka' },
  { en:'KIT', tr:'Takım/set' },
  { en:'LAB', tr:'Laboratuvar' },
  { en:'LAD', tr:'Genç erkek' },
  { en:'LAP', tr:'Kucak' },
  { en:'LAW', tr:'Kanun' },
  { en:'LAY', tr:'Koymak/sermek' },
  { en:'LEG', tr:'Bacak' },
  { en:'LID', tr:'Kapak' },
  { en:'LIP', tr:'Dudak' },
  { en:'LOG', tr:'Kütük' },
  { en:'LOT', tr:'Kura/grup' },
  { en:'MAP', tr:'Harita' },
  { en:'MIX', tr:'Karıştırmak' },
  { en:'MOP', tr:'Paspas' },
  { en:'MUD', tr:'Çamur' },
  { en:'MUG', tr:'Kupa bardak' },
  { en:'NAP', tr:'Kısa uyku' },
  { en:'NET', tr:'Ağ' },
  { en:'NUT', tr:'Fındık/ceviz' },
  { en:'ODD', tr:'Tek sayı/tuhaf' },
  { en:'OIL', tr:'Yağ' },
  { en:'OLD', tr:'Yaşlı veya eski' },
  { en:'PAD', tr:'Altlık/tablet' },
  { en:'PAN', tr:'Tava' },
  { en:'PAW', tr:'Hayvan pençesi' },
  { en:'PAY', tr:'Ödemek' },
  { en:'PEA', tr:'Bezelye' },
  { en:'PEN', tr:'Kalem' },
  { en:'POT', tr:'Tencere' },
  { en:'PUB', tr:'Birahane' },
  { en:'PUP', tr:'Yavru köpek' },
  { en:'RAG', tr:'Paçavra bez' },
  { en:'RAM', tr:'Koç hayvanı' },
  { en:'RAP', tr:'Rap müzik türü' },
  { en:'RAW', tr:'Ham veya çiğ' },
  { en:'RAY', tr:'Işın/ışık huzme' },
  { en:'RIB', tr:'Kaburga kemiği' },
  { en:'ROB', tr:'Soymak/çalmak' },
  { en:'ROD', tr:'Metal çubuk' },
  { en:'ROT', tr:'Çürümek' },
  { en:'ROW', tr:'Sıra/kavga' },
  { en:'RUB', tr:'Ovmak/sürtmek' },
  { en:'RUG', tr:'Halı veya kilim' },
  { en:'RUN', tr:'Koşmak' },
  { en:'RYE', tr:'Çavdar tahılı' },
  { en:'SAP', tr:'Bitki özsuyu' },
  { en:'SAW', tr:'Testere aleti' },
  { en:'SAY', tr:'Söylemek' },
  { en:'SEA', tr:'Deniz' },
  { en:'SEW', tr:'Dikmek/iğnelemek' },
  { en:'SHY', tr:'Utangaç' },
  { en:'SIN', tr:'Günah' },
  { en:'SIP', tr:'Yudumlamak' },
  { en:'SIT', tr:'Oturmak' },
  { en:'SIX', tr:'Altı sayısı' },
  { en:'SKI', tr:'Kayak yapmak' },
  { en:'SKY', tr:'Gökyüzü' },
  { en:'SOB', tr:'Hıçkırarak ağlamak' },
  { en:'SOY', tr:'Soya fasulyesi' },
  { en:'SPA', tr:'Kaplıca/spa merkezi' },
  { en:'SPY', tr:'Casus' },
  { en:'SUB', tr:'Denizaltı gemisi' },
  { en:'SUM', tr:'Toplam' },
  { en:'SUN', tr:'Güneş' },
  { en:'TAB', tr:'Sekme/kulakçık' },
  { en:'TAP', tr:'Musluk/hafif vuruş' },
  { en:'TAR', tr:'Katran' },
  { en:'TAX', tr:'Vergi' },
  { en:'TEA', tr:'Çay içeceği' },
  { en:'TIP', tr:'Bahşiş/ipucu' },
  { en:'TON', tr:'Ton ağırlık birimi' },
  { en:'TOW', tr:'Araç çekmek' },
  { en:'TOY', tr:'Oyuncak' },
  { en:'TUB', tr:'Küvet/fıçı' },
  { en:'TUG', tr:'Çekmek/römorkör' },
  { en:'TWO', tr:'İki sayısı' },
  { en:'URN', tr:'Büyük kap/vazo' },
  { en:'VAN', tr:'Kargo minibüsü' },
  { en:'VAT', tr:'KDV vergisi' },
  { en:'VEX', tr:'Sinir etmek' },
  { en:'VIA', tr:'Yoluyla/üzerinden' },
  { en:'WAD', tr:'Kağıt destesi' },
  { en:'WAR', tr:'Savaş' },
  { en:'WAX', tr:'Balmumu' },
  { en:'WAY', tr:'Yol/yöntem' },
  { en:'WEB', tr:'Ağ/internet' },
  { en:'WET', tr:'Islak' },
  { en:'WHO', tr:'Kim zamiri' },
  { en:'WHY', tr:'Neden/niçin' },
  { en:'WIG', tr:'Peruk' },
  { en:'WIT', tr:'Zeka/espri' },
  { en:'WOK', tr:'Wok pişirme tavası' },
  { en:'WOW', tr:'Vay canına ünlemi' },
  { en:'YAM', tr:'Tatlı patates' },
  { en:'ZAP', tr:'Elektrik çarpmak' },
  { en:'ZEN', tr:'Budist meditasyon' },
  { en:'ZOO', tr:'Hayvanat bahçesi' },
  { en:'WIN', tr:'Kazanmak' },
  { en:'TIE', tr:'Beraberlik/kravat' },
  { en:'ACE', tr:'As oyun kartı' },
  { en:'BET', tr:'Bahis yapmak' },
  { en:'BID', tr:'Teklif vermek' },
  { en:'GEM', tr:'Değerli mücevher' },
  { en:'DEW', tr:'Çiy damlası' },
  { en:'FOG', tr:'Sis' },
  { en:'ORB', tr:'Küre veya top' },
  { en:'EGG', tr:'Yumurta' },
  { en:'PIE', tr:'Fırın turtası' },
  { en:'OX',  tr:'Öküz' },
  { en:'PHI', tr:'Yunan alfabesi harfi' },
  { en:'CHI', tr:'Yunan alfabesi harfi' },
  { en:'PSI', tr:'Yunan alfabesi harfi' },
  { en:'TAU', tr:'Yunan alfabesi harfi' },
  { en:'PHO', tr:'Vietnam çorbası' },
  { en:'YEP', tr:'Evet (gayri resmi)' },
  { en:'YET', tr:'Henüz/ama' },
  { en:'YEW', tr:'Porsuk ağacı' },
  { en:'AMP', tr:'Elektrik akımı birimi' },
  { en:'BIT', tr:'En küçük veri birimi' },
  { en:'BUG', tr:'Böcek/yazılım hatası' },
  { en:'BUN', tr:'Topuz saç/çörek' },
  { en:'BUS', tr:'Otobüs' },
  { en:'CAB', tr:'Taksi' },
  { en:'CAN', tr:'Kutu/yapabilmek' },
  { en:'CAP', tr:'Şapka/kapak' },
  { en:'COP', tr:'Polis memuru' },
  { en:'COT', tr:'Portatif yatak' },
  { en:'CUB', tr:'Yavru ayı' },
  { en:'CUE', tr:'İpucu/işaret' },
  { en:'CUP', tr:'Fincan/kupa' },
  { en:'CUR', tr:'Cins dışı köpek' },
  { en:'CUT', tr:'Kesmek' },
  { en:'DAB', tr:'Hafifçe dokunmak' },
  { en:'DAM', tr:'Baraj/set' },
  { en:'DEN', tr:'İn/çalışma odası' },
  { en:'DIM', tr:'Loş/sönük' },
  { en:'DIP', tr:'Batırmak/eğim' },
  { en:'DOT', tr:'Nokta' },
  { en:'DUB', tr:'Seslendirmek' },
  { en:'DUG', tr:'Kazdı (fiil)' },
  { en:'DUO', tr:'İkili grup' },
  { en:'EAR', tr:'Kulak' },
  { en:'EAT', tr:'Yemek' },
  { en:'ELK', tr:'Büyük geyik' },
  { en:'ELM', tr:'Karaağaç ağacı' },
  { en:'FAD', tr:'Geçici moda' },
  { en:'FAN', tr:'Hayran/yelpaze' },
  { en:'FAR', tr:'Uzak' },
  { en:'FAT', tr:'Şişman/yağ' },
  { en:'FED', tr:'Besledi (fiil)' },
  { en:'FEW', tr:'Birkaç' },
  { en:'FIG', tr:'İncir meyvesi' },
  { en:'FIN', tr:'Balık yüzgeci' },
  { en:'FIT', tr:'Uygun/sağlıklı' },
  { en:'FIX', tr:'Tamir etmek' },
  { en:'FLY', tr:'Sinek/uçmak' },
  { en:'FRY', tr:'Kızartmak' },
  { en:'FUN', tr:'Eğlence' },
  { en:'FUR', tr:'Kürk' },
  { en:'GAB', tr:'Gevezelik etmek' },
  { en:'GAG', tr:'Şaka/nefes tıkanma' },
  { en:'GAP', tr:'Boşluk/aralık' },
  { en:'GAS', tr:'Gaz/benzin' },
  { en:'GEL', tr:'Jel madde' },
  { en:'GET', tr:'Almak/elde etmek' },
  { en:'GOB', tr:'Büyük lokma' },
  { en:'GOD', tr:'Tanrı' },
  { en:'GOT', tr:'Aldı/elde etti' },
  { en:'GUM', tr:'Zamk/diş eti' },
  { en:'GUN', tr:'Silah/tabanca' },
  { en:'GUT', tr:'Bağırsak/cesaret' },
  { en:'GUY', tr:'Adam/erkek' },
  { en:'HAD', tr:'Vardı (fiil)' },
  { en:'HAM', tr:'Jambon' },
  { en:'HAS', tr:'Var (fiil)' },
  { en:'HAT', tr:'Şapka' },
  { en:'HAY', tr:'Saman/ot' },
  { en:'HIT', tr:'Vurmak/isabet' },
  { en:'HOG', tr:'Domuz' },
  { en:'HOP', tr:'Atlamak/şerbetçiotu' },
  { en:'HOT', tr:'Sıcak' },
  { en:'HUB', tr:'Merkez/göbek' },
  { en:'HUG', tr:'Sarılmak' },
  { en:'HUM', tr:'Mırıldanmak' },
  { en:'HUT', tr:'Kulübe' },
];

/* ═══════════════════════════════════════════════════════
   KELİME BANKASI OLUŞTUR
   ═══════════════════════════════════════════════════════ */
function buildWordBank() {
  const raw = [...SPECIALS, ...a1_a2, ...b1_b2, ...c1_c2, ...academic];
  const seen = new Set();
  const result = [];
  for (const w of raw) {
    if (!w.en || !w.tr) continue;
    const en = w.en.toUpperCase().replace(/[^A-Z]/g, '');
    if (!en || en.length < 2 || en.length > 6) continue;
    if (seen.has(en)) continue;
    seen.add(en);
    result.push({ en, tr: w.tr });
  }
  return result;
}

/* ═══════════════════════════════════════════════════════
   PRNG (Seeded Random)
   ═══════════════════════════════════════════════════════ */
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ═══════════════════════════════════════════════════════
   BULMACA ÜRETİCİ — Yön-Harita Tabanlı Yoğun Algoritma
   ═══════════════════════════════════════════════════════ */
const ROWS = 9, COLS = 7;
const R_MIN = 1, R_MAX = 8;
const C_MIN = 1, C_MAX = 6;

function buildPuzzle(wordBank, seed) {
  const rand = rng(seed);

  // Minimum 2 harfli kelimeler, karıştırılmış
  const bank = wordBank.filter(w => w.en.length >= 2);
  const shuffled = [...bank].sort(() => rand() - 0.5);

  // Harf ızgarası: null = siyah hücre
  const G = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  // Yön haritası: bit1=across, bit2=down (her hücrenin hangi yönlerle örtüldüğünü tutar)
  const D = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  const used = new Set();
  const placed = [];

  // ── Harf→kelime indeksi ─────────────────────────────
  const byLetter = {};
  for (const w of shuffled) {
    for (let i = 0; i < w.en.length; i++) {
      const l = w.en[i];
      if (!byLetter[l]) byLetter[l] = [];
      byLetter[l].push({ w, i });
    }
  }

  // ── Yerleştirme Kontrolü ─────────────────────────────
  // freePlace=true → kesişim zorunluluğu yok (2. geçiş için)
  function canPlace(en, startR, startC, dir, freePlace = false) {
    const len = en.length;
    const db = dir === 'across' ? 1 : 2; // yön biti

    // Sınır kontrolü
    if (dir === 'across') {
      if (startR < R_MIN || startR > R_MAX) return false;
      if (startC < C_MIN || startC + len - 1 > C_MAX) return false;
      // Aynı yönde bitişik kelime birleşmesini engelle
      if (startC > C_MIN && (D[startR][startC - 1] & 1)) return false;
      if (startC + len <= C_MAX && (D[startR][startC + len] & 1)) return false;
    } else {
      if (startC < C_MIN || startC > C_MAX) return false;
      if (startR < R_MIN || startR + len - 1 > R_MAX) return false;
      if (startR > R_MIN && (D[startR - 1][startC] & 2)) return false;
      if (startR + len <= R_MAX && (D[startR + len][startC] & 2)) return false;
    }

    let hasIntersect = freePlace || placed.length === 0;

    for (let i = 0; i < len; i++) {
      const r = dir === 'across' ? startR : startR + i;
      const c = dir === 'across' ? startC + i : startC;
      const cell = G[r][c];

      if (cell !== null) {
        // Aynı yön zaten bu hücreyi kaplıyorsa geçersiz
        if (D[r][c] & db) return false;
        // Harf uyuşmazlığı
        if (cell !== en[i]) return false;
        hasIntersect = true; // çapraz kesişim
      }
    }

    return hasIntersect;
  }

  // ── Kelimeyi ızgaraya yerleştir ─────────────────────
  function doPlace(w, startR, startC, dir) {
    const db = dir === 'across' ? 1 : 2;
    for (let i = 0; i < w.en.length; i++) {
      const r = dir === 'across' ? startR : startR + i;
      const c = dir === 'across' ? startC + i : startC;
      G[r][c] = w.en[i];
      D[r][c] |= db;
    }
    placed.push({ ...w, r: startR, c: startC, dir });
    used.add(w.en);
  }

  // ── 1. Adım: İlk kelimeyi ortaya yerleştir ──────────
  const first = shuffled.find(w => w.en.length >= 3 && w.en.length <= 5);
  if (first) doPlace(first, 4, C_MIN, 'across');

  // ── 2. Adım: Kesişim tabanlı ana döngü ──────────────
  const TARGET = 30;
  const MAX_ATTEMPTS = 10000;
  let attempts = 0;

  while (placed.length < TARGET && attempts < MAX_ATTEMPTS) {
    attempts++;
    const pw = placed[Math.floor(rand() * placed.length)];
    const perpDir = pw.dir === 'across' ? 'down' : 'across';
    const pwI = Math.floor(rand() * pw.en.length);
    const targetLetter = pw.en[pwI];
    const targetR = pw.dir === 'across' ? pw.r : pw.r + pwI;
    const targetC = pw.dir === 'across' ? pw.c + pwI : pw.c;

    const cands = byLetter[targetLetter];
    if (!cands || cands.length === 0) continue;

    const si = Math.floor(rand() * cands.length);
    for (let ci = 0; ci < Math.min(cands.length, 60); ci++) {
      const { w, i: newI } = cands[(si + ci) % cands.length];
      if (used.has(w.en)) continue;
      const startR = perpDir === 'across' ? targetR : targetR - newI;
      const startC = perpDir === 'across' ? targetC - newI : targetC;
      if (canPlace(w.en, startR, startC, perpDir)) {
        doPlace(w, startR, startC, perpDir);
        break;
      }
    }
  }

  // ── 3. Adım: Boş satırlara across kelimesi ekle ─────
  for (let r = R_MIN; r <= R_MAX; r++) {
    if (placed.some(w => w.dir === 'across' && w.r === r)) continue;
    for (let startC = C_MIN; startC <= C_MAX - 1; startC++) {
      const found = shuffled.find(w =>
        !used.has(w.en) && canPlace(w.en, r, startC, 'across', true)
      );
      if (found) { doPlace(found, r, startC, 'across'); break; }
    }
  }

  // ── 4. Adım: Boş sütunlara down kelimesi ekle ───────
  for (let c = C_MIN; c <= C_MAX; c++) {
    if (placed.some(w => w.dir === 'down' && w.c === c)) continue;
    for (let startR = R_MIN; startR <= R_MAX - 1; startR++) {
      const found = shuffled.find(w =>
        !used.has(w.en) && canPlace(w.en, startR, c, 'down', true)
      );
      if (found) { doPlace(found, startR, c, 'down'); break; }
    }
  }

  // Çok az kelime varsa farklı seed ile yeniden dene
  if (placed.length < 10) return buildPuzzle(wordBank, seed + 1337);

  return { grid: G, placed };
}

/* ═══════════════════════════════════════════════════════
   GÜNLÜK SEED (her gece 00:00'da değişir)
   ═══════════════════════════════════════════════════════ */
function getDaySeed() {
  const now = new Date();
  // UTC günü (2024-01-01'den itibaren gün sayısı)
  const utcDay = Math.floor(now.getTime() / 86400000);
  return ((utcDay * 7919) ^ 0x5a4b3c2d) & 0x7fffffff;
}

/* ═══════════════════════════════════════════════════════
   ANA COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function DuelGame({ onBack }) {
  const [wordBank]  = useState(() => buildWordBank());
  const [puzzle,  setPuzzle]  = useState(null);
  const [conf,    setConf]    = useState([]);   // Onaylanan harfler
  const [pls,     setPls]     = useState({});   // Geçici yerleştirmeler
  const [hand,    setHand]    = useState([]);   // Eldeki taşlar
  const [selTile, setSelTile] = useState(null);
  const [selWord, setSelWord] = useState(null);
  const [pScore,  setPScore]  = useState(0);
  const [aScore,  setAScore]  = useState(0);
  const [turn,    setTurn]    = useState(1);
  const [phase,   setPhase]   = useState('loading');
  const [popups,  setPopups]  = useState([]);
  const [wordBonus, setWordBonus] = useState(null);
  const swaps    = useRef(3);
  const dragTile = useRef(null);

  /* ── Başlatma ── */
  useEffect(() => {
    const p = buildPuzzle(wordBank, getDaySeed());
    const initConf = Array.from({ length: ROWS }, () => Array(COLS).fill(''));
    setPuzzle(p);
    setConf(initConf);
    setPhase('playing');
    dealHand(p, initConf);
  }, []); // eslint-disable-line

  /* ── El Dağıt ── */
  function dealHand(pzl, currentConf) {
    const pool = [];
    for (let r = R_MIN; r <= R_MAX; r++)
      for (let c = C_MIN; c <= C_MAX; c++)
        if (pzl.grid[r][c] && !currentConf[r]?.[c])
          pool.push(pzl.grid[r][c]);
    pool.sort(() => Math.random() - 0.5);

    const h = [];
    for (let i = 0; i < 5; i++) {
      const letter = pool.length > 0 ? pool[i % pool.length] : 'AEIOU'[i];
      h.push({ id: Date.now() + i + Math.random(), letter, used: false });
    }
    setHand(h);
    setPls({});
    setSelTile(null);
  }

  /* ── Yardımcılar ── */
  const ck = (r, c) => `${r},${c}`;

  function wordsAt(r, c) {
    if (!puzzle) return [];
    return puzzle.placed.filter(w =>
      w.dir === 'across'
        ? w.r === r && c >= w.c && c < w.c + w.en.length
        : w.c === c && r >= w.r && r < w.r + w.en.length
    );
  }

  // Sol kenarda ipucu gösterilecek kelime (satır başından başlayan yatay kelime)
  function rowWord(r) {
    return puzzle?.placed.find(w => w.dir === 'across' && w.r === r && w.c === C_MIN) ?? null;
  }

  // Üst kenarda ipucu gösterilecek kelime (sütun başından başlayan dikey kelime)
  function colWord(c) {
    return puzzle?.placed.find(w => w.dir === 'down' && w.c === c && w.r === R_MIN) ?? null;
  }

  // Bu hücrede başlayan kelimeler (iç-hücre ipuçları için)
  function startersAt(r, c) {
    return puzzle?.placed.filter(w => w.r === r && w.c === c) ?? [];
  }

  function wordDone(w, currentConf) {
    if (!w || !currentConf) return false;
    for (let i = 0; i < w.en.length; i++) {
      const r = w.dir === 'across' ? w.r : w.r + i;
      const c = w.dir === 'across' ? w.c + i : w.c;
      if (!currentConf[r]?.[c]) return false;
    }
    return true;
  }

  /* ── Puan Balonu ── */
  function showPopup(r, c, text, type) {
    const id = Date.now() + Math.random();
    setPopups(prev => [...prev, { id, r, c, text, type }]);
    setTimeout(() => setPopups(prev => prev.filter(p => p.id !== id)), 1300);
  }

  /* ── Hücre Tıklama ── */
  function cellClick(r, c) {
    if (phase !== 'playing' || !puzzle) return;
    if (!puzzle.grid[r][c]) return;

    // Kelime seç / değiştir
    const ws = wordsAt(r, c);
    if (ws.length) {
      setSelWord(sw =>
        sw && ws.includes(sw) && ws.length > 1
          ? ws[(ws.indexOf(sw) + 1) % ws.length]
          : ws[0]
      );
    }

    if (conf[r]?.[c]) return; // Zaten onaylı

    const key = ck(r, c);

    // Geçici taşı geri al
    if (pls[key]) {
      const letter = pls[key];
      setHand(h => h.map(t => t.used && t.letter === letter ? { ...t, used: false } : t));
      setPls(p => { const n = { ...p }; delete n[key]; return n; });
      setSelTile(null);
      return;
    }

    // Seçili taşı yerleştir
    if (selTile && !selTile.used) {
      setHand(h => h.map(t => t.id === selTile.id ? { ...t, used: true } : t));
      setPls(p => ({ ...p, [key]: selTile.letter }));
      setSelTile(null);
    }
  }

  function edgeClick(w) {
    if (w) setSelWord(w);
  }

  /* ── Sürükle-Bırak ── */
  function onTileDragStart(e, tile) {
    dragTile.current = tile;
    e.dataTransfer.effectAllowed = 'move';
  }
  function onCellDragOver(e, r, c) {
    if (!puzzle?.grid[r][c] || conf[r]?.[c]) return;
    e.preventDefault();
  }
  function onCellDrop(e, r, c) {
    e.preventDefault();
    const tile = dragTile.current;
    if (!tile || !puzzle?.grid[r][c] || conf[r]?.[c]) return;
    const key = ck(r, c);
    if (pls[key]) {
      const old = pls[key];
      setHand(h => h.map(t =>
        t.used && t.letter === old && t.id !== tile.id ? { ...t, used: false } : t
      ));
    }
    setPls(p => ({ ...p, [key]: tile.letter }));
    setHand(h => h.map(t => t.id === tile.id ? { ...t, used: true } : t));
    dragTile.current = null;
  }

  /* ── Onayla ── */
  function doConfirm() {
    if (phase !== 'playing' || !puzzle) return;
    if (Object.keys(pls).length === 0) { doAI(conf); return; }

    const newConf = conf.map(row => [...row]);
    const prevDone = new Set(puzzle.placed.filter(w => wordDone(w, conf)).map(w => w.en));
    let delta = 0;
    const wrongKeys = [];

    Object.entries(pls).forEach(([key, letter]) => {
      const [r, c] = key.split(',').map(Number);
      if (puzzle.grid[r][c] === letter) {
        newConf[r][c] = letter;
        delta += 1;
        showPopup(r, c, '+1', 'pos');
      } else {
        delta -= 1;
        wrongKeys.push({ key, letter });
        showPopup(r, c, '-1', 'neg');
      }
    });

    // Yanlış taşları iade et
    const wrongLetters = wrongKeys.map(x => x.letter);
    setHand(h => h.map(t =>
      t.used && wrongLetters.includes(t.letter) ? { ...t, used: false } : t
    ));
    const newPls = { ...pls };
    wrongKeys.forEach(({ key }) => delete newPls[key]);
    setPls(newPls);

    // Kelime tamamlama bonusu
    let bonusTotal = 0;
    const bonusWords = [];
    puzzle.placed.forEach(w => {
      if (!prevDone.has(w.en) && wordDone(w, newConf)) {
        bonusTotal += w.en.length;
        bonusWords.push(w.en);
      }
    });

    setPScore(s => Math.max(0, s + delta + bonusTotal));
    setConf(newConf);

    if (bonusWords.length > 0) {
      setWordBonus(`🎉 +${bonusTotal} — ${bonusWords.join(', ')}!`);
      setTimeout(() => setWordBonus(null), 2000);
    }

    setPhase('ai');
    setTimeout(() => doAI(newConf), 900);
  }

  /* ── AI Rakip ── */
  function doAI(currentConf) {
    if (!puzzle) return;
    const newConf = currentConf.map(row => [...row]);
    const prevDone = new Set(puzzle.placed.filter(w => wordDone(w, currentConf)).map(w => w.en));

    // Boş hücreleri bul
    const empty = [];
    for (let r = R_MIN; r <= R_MAX; r++)
      for (let c = C_MIN; c <= C_MAX; c++)
        if (puzzle.grid[r][c] && !newConf[r][c])
          empty.push({ r, c });
    empty.sort(() => Math.random() - 0.5);

    // AI: 5 deneme, %62 başarı
    let aiDelta = 0;
    empty.slice(0, 5).forEach(({ r, c }) => {
      if (Math.random() < 0.62) {
        newConf[r][c] = puzzle.grid[r][c];
        aiDelta++;
      }
    });

    // AI kelime bonusu
    puzzle.placed.forEach(w => {
      if (!prevDone.has(w.en) && wordDone(w, newConf))
        aiDelta += w.en.length;
    });

    setAScore(s => s + aiDelta);
    setConf(newConf);

    // Bitmedi mi?
    const allDone = (() => {
      for (let r = R_MIN; r <= R_MAX; r++)
        for (let c = C_MIN; c <= C_MAX; c++)
          if (puzzle.grid[r][c] && !newConf[r][c]) return false;
      return true;
    })();

    const nextTurn = turn + 1;
    setTurn(nextTurn);

    if (allDone || nextTurn > 10) {
      setPhase('done');
      return;
    }

    setTimeout(() => {
      dealHand(puzzle, newConf);
      setPhase('playing');
    }, 700);
  }

  /* ── Değiştir ── */
  function doSwap() {
    if (swaps.current <= 0 || phase !== 'playing' || !puzzle) return;
    swaps.current--;
    dealHand(puzzle, conf);
  }

  /* ══════════════ RENDER ══════════════ */

  if (phase === 'loading' || !puzzle) {
    return (
      <div className="cu-loading">
        <div className="cu-spinner" />
        <span>Günlük bulmaca hazırlanıyor...</span>
      </div>
    );
  }

  if (phase === 'done') {
    const won = pScore > aScore;
    return (
      <div className="cu-screen">
        <div className="cu-topbar">
          <button className="cu-xbtn" onClick={onBack}>✕</button>
          <div className="cu-logo"><span className="cu-lsq" />CROSS<span className="cu-lup">UP</span></div>
          <div />
        </div>
        <div className="cu-result">
          <div className="cu-result-icon">{won ? '🏆' : pScore === aScore ? '🤝' : '😤'}</div>
          <div className="cu-result-title">
            {won ? 'Kazandın!' : pScore === aScore ? 'Berabere!' : 'Rakip kazandı!'}
          </div>
          <div className="cu-result-scores">
            <div className={`cu-result-box${won ? ' cu-winner' : ''}`}>
              <div className="cu-result-name">Sen</div>
              <div className="cu-result-num">{pScore}</div>
            </div>
            <div className="cu-result-vs">VS</div>
            <div className={`cu-result-box${!won && pScore !== aScore ? ' cu-winner' : ''}`}>
              <div className="cu-result-name">Rakip</div>
              <div className="cu-result-num">{aScore}</div>
            </div>
          </div>
          <div className="cu-result-words">
            {puzzle.placed.map((w, i) => (
              <div key={i} className={`cu-result-word${wordDone(w, conf) ? ' done' : ''}`}>
                <span className="cu-result-dir">{w.dir === 'across' ? '▶' : '▼'}</span>
                <span className="cu-result-clue">{w.tr}</span>
                <span className="cu-result-eq">=</span>
                <span className="cu-result-ans">{w.en}</span>
              </div>
            ))}
          </div>
          <button className="cu-back-btn" onClick={onBack}>Ana Menüye Dön</button>
        </div>
      </div>
    );
  }

  const hasPlaced = Object.keys(pls).length > 0;

  return (
    <div className="cu-screen">
      {wordBonus && <div className="cu-word-bonus">{wordBonus}</div>}

      {/* ── Üst Bar ── */}
      <div className="cu-topbar">
        <button className="cu-xbtn" onClick={onBack}>✕</button>
        <div className="cu-logo"><span className="cu-lsq" />CROSS<span className="cu-lup">UP</span></div>
        <div className="cu-topbar-icons">
          <div className="cu-ticon">📊</div>
          <div className="cu-ticon">❓</div>
        </div>
      </div>

      {/* ── Skor Barı ── */}
      <div className="cu-scorebar">
        <div className={`cu-stog${pScore >= aScore ? '' : ' off'}`}>
          <div className={`cu-sdot${pScore >= aScore ? '' : ' g'}`} />
          <span className={`cu-sname${pScore >= aScore ? '' : ' g'}`}>Sen</span>
          <span className={`cu-snum${pScore >= aScore ? '' : ' g'}`}>{pScore}</span>
        </div>
        <div className="cu-smid">
          <span className="cu-svs">VS</span>
          <span className="cu-stur">Tur {turn}/10</span>
        </div>
        <div className={`cu-stog${aScore > pScore ? '' : ' off'}`} style={{ flexDirection: 'row-reverse' }}>
          <div className={`cu-sdot${aScore > pScore ? '' : ' g'}`} />
          <span className={`cu-sname${aScore > pScore ? '' : ' g'}`}>Rakip</span>
          <span className={`cu-snum${aScore > pScore ? '' : ' g'}`} style={{ marginLeft: 0, marginRight: 'auto' }}>{aScore}</span>
        </div>
      </div>

      {/* ── Seçili Kelime Bilgisi ── */}
      {selWord && (
        <div className="cu-clue-bar">
          <span className="cu-clue-dir">{selWord.dir === 'across' ? '▶' : '▼'}</span>
          <span className="cu-clue-text">{selWord.tr}</span>
          <span className="cu-clue-len">({selWord.en.length} harf)</span>
        </div>
      )}

      {/* ── Tahta ── */}
      <div className="cu-board-scroll">
        <table className="cu-table">
          <tbody>
            {Array.from({ length: ROWS }, (_, r) => (
              <tr key={r}>
                {Array.from({ length: COLS }, (_, c) => {

                  /* SOL ÜST KÖŞE */
                  if (r === 0 && c === 0)
                    return <td key={c} className="cu-corner" />;

                  /* ÜST KENAR — sütun ipucu */
                  if (r === 0) {
                    const dw = colWord(c);
                    const isSel = selWord === dw;
                    const isDone = wordDone(dw, conf);
                    return (
                      <td key={c}
                        className={`cu-th-col${isSel ? ' sel' : ''}${isDone ? ' done' : ''}${!dw ? ' empty' : ''}`}
                        onClick={() => edgeClick(dw)}>
                        {dw && (
                          <div className="cu-col-qi">
                            <div className="cu-col-qt">{dw.tr}</div>
                            <span className="cu-col-arr">▼</span>
                          </div>
                        )}
                      </td>
                    );
                  }

                  /* SOL KENAR — satır ipucu */
                  if (c === 0) {
                    const aw = rowWord(r);
                    const isSel = selWord === aw;
                    const isDone = wordDone(aw, conf);
                    return (
                      <td key={c}
                        className={`cu-th-row${isSel ? ' sel' : ''}${isDone ? ' done' : ''}${!aw ? ' empty' : ''}`}
                        onClick={() => edgeClick(aw)}>
                        {aw && (
                          <div className="cu-row-qi">
                            <div className="cu-row-qt">{aw.tr}</div>
                            <span className="cu-row-arr">▶</span>
                          </div>
                        )}
                      </td>
                    );
                  }

                  /* İÇ HÜCRELER */
                  const sol = puzzle.grid[r][c];
                  if (!sol) return <td key={c} className="cu-blk" />;

                  const key = ck(r, c);

                  // Bu hücrede başlayan kelimeler
                  const allStarters = startersAt(r, c);
                  // Kenar ipuçlarına dahil edilmeyenler → iç ipucu göster
                  const innerStarters = allStarters.filter(w =>
                    !(w.dir === 'across' && w.c === C_MIN) &&
                    !(w.dir === 'down'   && w.r === R_MIN)
                  );

                  const val    = conf[r][c] || pls[key] || '';
                  const isPend = !!pls[key] && !conf[r][c];
                  const isConf = !!conf[r][c];
                  const inSel  = selWord && wordsAt(r, c).includes(selWord);
                  const cellPop = popups.filter(p => p.r === r && p.c === c);

                  // CSS sınıfı belirle
                  let cls = 'cu-wh';
                  if (innerStarters.length > 0 && !val) cls = 'cu-qcell';
                  if (isConf) cls = 'cu-conf';
                  else if (isPend) cls = 'cu-placed';
                  if (inSel) cls += ' hl';

                  return (
                    <td key={c} className={cls}
                      onClick={() => cellClick(r, c)}
                      onDragOver={e => onCellDragOver(e, r, c)}
                      onDrop={e => onCellDrop(e, r, c)}>

                      {/* İç ipucu (harf yoksa göster) */}
                      {innerStarters.length > 0 && !val && (
                        <div className="cu-inner-qi">
                          <div className="cu-inner-qt">
                            {innerStarters.map(w => w.tr).join(' / ')}
                          </div>
                          <div className="cu-inner-qa">
                            {innerStarters.map((w, i) => (
                              <span key={i} className="cu-inner-ar">
                                {w.dir === 'across' ? '▶' : '▼'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Harf */}
                      {val && (
                        <span className={`cu-ltr${isPend ? ' pend' : isConf ? ' conf-l' : ''}`}>
                          {val}
                        </span>
                      )}

                      {/* Puan balonları */}
                      {cellPop.map(p => (
                        <span key={p.id} className={`cu-pop ${p.type}`}>{p.text}</span>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Alt Alan ── */}
      {phase === 'ai' ? (
        <div className="cu-waiting">
          <div className="cu-dots"><span /><span /><span /></div>
          <span>Rakip oynuyor...</span>
        </div>
      ) : (
        <div className="cu-bottom">
          {/* Taşlar */}
          <div className="cu-trow">
            {hand.map(tile => (
              <div key={tile.id}
                className={`cu-tile${tile.used ? ' used' : ''}${selTile?.id === tile.id ? ' sl' : ''}`}
                draggable={!tile.used}
                onClick={() => !tile.used && setSelTile(st => st?.id === tile.id ? null : tile)}
                onDragStart={e => !tile.used && onTileDragStart(e, tile)}>
                {tile.letter}
              </div>
            ))}
          </div>

          {/* Aksiyon butonları */}
          <div className="cu-acts">
            <div className="cu-abt" onClick={doSwap} title={`${swaps.current} hak`}>
              <span className="cu-aico">🔄</span>
              <span>Değiştir{swaps.current < 3 ? ` (${swaps.current})` : ''}</span>
            </div>

            <button className={`cu-obtn${hasPlaced ? '' : ' pas'}`} onClick={doConfirm}>
              {hasPlaced ? 'Onayla' : 'Pas'}
            </button>

            <div className="cu-abt" onClick={() => dealHand(puzzle, conf)} title="Yeni taşlar">
              <span className="cu-aico" style={{ fontSize: 16, fontWeight: 900 }}>+</span>
              <span>Yenile</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
