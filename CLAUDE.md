# yeswordno — Proje Notları (CLAUDE.md)

React + Vite kelime oyunu. Türkçe arayüz. Vercel'de yayında, GitHub: `yeswordno/yeswordno` (default branch: **master**).

## Çalıştırma
- `npm run dev` → Vite dev sunucusu
- `npm run build` → production build
- `node generator.js` → günlük çengel bulmacasını yeniden üretir (aşağıya bak)

## Oyun modları + ANA EKRAN (giriş: `screen === 'lang'`)
`src/App.jsx` tek bir `screen` state'iyle ekran yönetir: `'lang' | 'level' | 'game' | 'collection' | 'daily'`.

**Ana ekran AKORDEON yapısı** (`openSection: 'duello' | 'kutu' | null` — aynı anda biri açık):
1. **Kelime Avcısı** (başlık)
2. **⚔️ Günlük Düello** akordeonu → açılınca altta **Kolay/Orta/Zor** (renkli zorluk şeritli `.acc-level lvl-easy/medium/hard`) → seçince `setDailyLevel(lvl); setScreen('daily')` → `<CengelGame level=.. />`. **Ayrı zorluk ekranı KALDIRILDI** (eski `screen==='daily' && !dailyLevel` bloğu yok); CengelGame `onBack` → `setScreen('lang')`.
3. **🧩 Kutu Kutu Pense** akordeonu (= eski "Kelime Avcısı" çapraz oyunun ADI) → açılınca **İngilizce→Türkçe / Türkçe→İngilizce** → `handleLangSelect('EN_TR'|'TR_EN')` → `screen==='level'` (kategori: a1_a2/b1_b2/c1_c2/academic).
4. **🏆 Sıralama (ilk 3)** ana ekranda: `<ScoreboardPreview limit={3} />` → "Tümünü Gör" tam tabloyu açar (`showScoreboard`). **Tek tablo, ana ekranda** (zorluk ekranındaki eski önizleme kaldırıldı).
- Akordeon/öğe CSS'i `App.css`: `.accordion(.open)`, `.accordion-head/-body/-caret`, `.acc-item`, `.acc-level`, `.daily-avg-badge`.

> Kelime Avcısı (Kutu Kutu Pense) akış (lang/level/game/collection) **bozulmamalı**. Çengel ayrı bileşendir.

**Çok-kelimeli cevaplar artık ELENMİYOR** (eski filtre kaldırıldı): cevaptaki boşluk regex ile silinir (`swimming pool → SWIMMINGPOOL`), **ipucu boşluklu kalır**, ızgaraya sığması için `≤ GRID_SIZE(15)` sınırı sürer. Her iki oyunda da böyle (Günlük Düello generator `en`'i zaten `[^A-Z]` ile boşluksuzlaştırır). Izgara `gameLogic.js` `generateCrossword`, `GRID_SIZE=15`.

## Çengel "Günlük Düello" modu — `src/CengelGame.jsx` + `src/CengelGame.css`
Kendi kendine yeten bir bileşen. `App.jsx` içinde `import CengelGame from './CengelGame'` ile gelir, `<CengelGame onBack={() => setScreen('lang')} />` olarak render edilir.

### CSS İZOLASYONU (ÇOK ÖNEMLİ — bozma!)
yeswordno'nun kendi `App.css`'i ile çakışmasın diye çengel stilleri izole edildi:
- Tüm oyun `<div className="cengel-root">` sarmalı içinde render edilir.
- CSS değişkenleri (`--text-dark` dahil) `:root` yerine **`.cengel-root`** altında tanımlı (yeswordno'nun kendi `--text-dark`'ı farklı; karışmasın diye).
- Tek çakışan sınıf olan `.cell` → çengelde **`.cg-cell`** olarak yeniden adlandırıldı (hem JSX className'lerinde hem CSS'te).
- `*` ve `body` kuralları `.cengel-root *` / `.cengel-root` olarak kapsandı.
- Diğer çengel sınıfları (`.puzzle-grid`, `.letter-tile`, `.rack-tile`, `.fly-point`, `.result-overlay` vb.) benzersiz; dokunmaya gerek yok.

**cengel-oyunu prototipi:** `C:\Users\Abd-Win\Desktop\cengel-oyunu` ayrı bir klasördür; orada aynı oyun `src/App.jsx` + `src/App.css` olarak (izolasyonsuz, `.cell`, `:root`) durur ve canlı önizlemesi vardır. Genelde değişiklik orada geliştirilip test edilir, sonra `CengelGame.jsx/.css`'e port edilir. Port ederken yukarıdaki izolasyon düzenlemeleri tekrar uygulanır:
1. `import './App.css'` → `import './CengelGame.css'`
2. `const App = ({ onBack } = {})` → `const CengelGame = ({ onBack } = {})`, `export default App` → `export default CengelGame`
3. En dış `<div className="cengel-root">` sarmalı + header'da `{onBack && <button className="cengel-back" onClick={onBack}>← Menü</button>}`
4. `.cell` className token'ları → `.cg-cell` (4 yer: empty, clue-both, clue, letter-box dizisi)
5. CSS: `:root`→`.cengel-root`, `body`/`*` kapsama, `.cell`→`.cg-cell` (replace-all), sonuna `.cengel-back` stili

### Zorluk seviyeleri (Günlük Düello)
- Seviye **ana ekrandaki Günlük Düello akordeonundan** seçilir (ayrı ekran yok). Seçilince `<CengelGame level={dailyLevel} key={dailyLevel} onBack={()=>{setScreen('lang');setDailyLevel(null);}} />` (`key` → taze mount).
- `CengelGame` `level` prop'una göre `fetch('/puzzles/daily-<level>.json')` çeker. **Header:** sol-üstte yuvarlak **✕** (`.cengel-close`, menüye/seviye seçimine döner) + sağ-üstte yuvarlak **?** (`.cengel-help`, "Nasıl Oynanır?" modalı `showHelp`) — ikisi simetrik. Ortada `WORD TR` logosu, altında Sen/Rakip skor tablosu. Alt kontroller: **↺ GERİ** (undo), **⇄ DEĞİŞTİR** (`shuffleRack`, `.shuffle-icon`), **ONAYLA/PAS** (`submitTurn`).
- **Bulmaca dosyası artık KUYRUK formatı:** `{ level, generated, puzzles: [ {id:<tarih>, ...}, ... ] }` (7 günlük tampon). Fetch handler İstanbul tarihine göre **bugünün** kaydını seçer (`puzzles.find(id===today)` → yoksa `id<=today` en günceli → yoksa son eleman). **Eski tek-obje formatıyla geri uyumlu** (`raw.puzzles` yoksa `raw`'ı doğrudan kullanır) → deploy uyumsuzluğunda kırılmaz. Bkz. "Kuyruk/tampon" başlığı.
- **Seviye save anahtarı:** `cengel_save_<level>_<puzzleId>` (her seviye ayrı ilerleme).

### Önemli davranışlar (CengelGame)
- **TEMA = Açık Glassmorphism (göl/iskele fotoğrafı zemini).** Değişkenler `.cengel-root`'ta; tek **mavi accent** (`--accent:#4c8dff`, `--accent-gradient`). Zemin: `public/bg.jpg` (45 KB), **sabit `.cengel-root::before`** katmanı (`background-attachment:fixed` mobilde takıldığı için kullanılmadı). Paneller buzlu cam (`--glass-bg/strong/border`, `backdrop-filter`). Izgara hücreleri **bitişik** (`gap:2px`).
  - **Hücre tipleri:** soru = **bal** (`--clue-bg: rgba(224,192,120,.8)`, tüm sorular AYNI ton; çift-soru orta çizgi+oklarla ayrışır) · doldurulabilir boş = beyaz buzlu **iç gölgeli yuva** · **pasif/blok = OPAK siyaha-yakın gri, kabarık** (dışbükey gölge, zeminden bağımsız).
- **Taş durumları (TAKAS edildi):** koyulan-onaylanmamış = **beyaz + mavi ışıltı**; onaylanmış-doğru = **mavi gradient** (`--accent-gradient`). **Oyuncu ve rakip onaylı taşı AYNI** (renk ayrımı yok). Raf taşı = beyaz 3D klavye tuşu (seçili → mavi parıltılı yükselen).
- **Tamamlanan kelime çerçevesi = beyaz** (ışıltılı), `.word-box`.
- **Skor anında işlenmez:** `+1/−1/+N` puanlar hücreden skor tablosuna **uçar** (`flyingPoints` + Web Animations API). Skor, uçuş bitince `landScore(who, value)` ile işlenir. Oyuncu skoru `Math.max(0, ...)` ile 0 tabanlı.
- **Yanlış harf:** köşede `−1` belirir, sonra **koyu taşı** rafa geri uçar (`flyingTiles`).
- **Rakip taşı uçar (yerleşme):** rakip hamlede taşlar **"Rakip" yazısının sağından** (`oppLabelRef`, skor sayısından DEĞİL) hücreye kademeli uçar (`flyingOppTiles`, `flyOppTileToCell`, ~880ms, 280ms arayla); inince hücre kilitlenir + `+1` skora uçar.
- **Rakip (medium AI):** oyuncudan ~3.5s sonra oynar, dağılım 1:%30 / 2:%45 / 3:%25 (ort. ~1.95 taş/hamle). **Sadece harfi havuzda olan hücreleri doldurur** → oyuncunun eli "alakasız taş"a dönüşmez ve **oyuncu+rakip = boş hücre** tutarlı kalır. Stale-closure'a karşı `poolRef/gridStateRef/oppLockedRef/rackRef`.
- **REZERV mekanizması (son taşlar hep oyuncuya kalmasın):** `OPP_SHARE=0.4` → rakip harf hücrelerinin ~%40'ını doldurur. (a) `runOpponentTurn` rakibi **hedef payını aşmaktan alıkoyar** (`oppRemaining = OPP_SHARE*N - oppLocked`, payını oyun boyunca dengeli doldurur). (b) `finalizeRack` raf kapağını `cap = min(5, kalanBoşHücre − oppRemaining)` yapar → rakibin payı kadar harf **havuzda rezerv** tutulur, oyuncunun rafına çekilmez → o hücreleri rakip doldurur. Böylece bitiş 3/2 gibi karışır, son hamle bazen rakipte. *(Önceki "CLAIM_PROB kapma" yaklaşımı kaldırıldı — finalizeRack refill'i son harfi hep oyuncuya çekiyordu.)*
  - **KOTA KAPISI İSTİSNASI (kilitlenme düzeltmesi):** Kota kapısı yalnızca **normal orta oyunda** (oyuncu ilerliyorken VE >10 boş hücre varken) geçerli. **Oyun sonunda (`available.length <= ENDGAME_CELLS=10`) VEYA oyuncu o turda hiç hücre kilitlemediyse (saf PAS)** kota KALDIRILIR → rakip havuzda oynayabildiği her şeyi oynar ("kim oynayabilirse oynar"). Önceki hata: kota dolduktan sonra rakip, havuzdaki rezerv hücreleri bile oynamayıp pas geçiyordu; oyuncu da pas geçince hiç kimse oynamıyor → kalan boş hücreler "hep oyuncununmuş" gibi takılıp **kilitleniyordu** (ör. 7 boş hücre / 5 raf taşı / 2 havuz → kimse oynamıyor). Rakip zaten yalnızca **havuzdaki** harflerden oynadığı için (oyuncunun rafını çalamaz) kota gevşese bile rakip oyuncunun payını alamaz; havuzun kendisi rakibi ~%40 ile sınırlar. `runOpponentTurn`'e `playerProgressed` parametresi eklendi; otomatik-bitirme çağrısı `false` geçer.
- **Oyuncunun taşı bitince:** rakip hamlesi sonunda raf boş + hâlâ (rakibe ait) hücre varsa rakip **otomatik devam** eder (`busy` açık kalır, PAS gerekmez) → kalan hücreleri rakip bitirir.
- **Bonus hücreler (H2/H3/K2):** Scrabble benzeri. **H2** harften +2, **H3** harften +3, **K2** işaretli kelime tamamlanınca **kelime bonusu 2 kat** (ör. 5 harflik kelime → +5 yerine +10; harf puanları ayrı). Adet: **2× H2, 1× H3, 1× K2**. `computeBonuses(puzzle)` bulmaca kimliğinden (tarih) **deterministik** üretir (`mulberry32` tohumu → her gün herkese aynı; yeniden generate gerekmez, save ile tutarlı). **K2 kelimesinin hücrelerine H2/H3 KONMAZ** (çakışma yok). Boş harf hücresinde **H²/H³ rozeti** ortada büyükçe görünür (`.cell-bonus`, `clamp(1rem,4.5vw,1.6rem)`). **K² artık yıldız+etiket değil:** ilgili SORU hücresinin **sağ-üst köşesinde şık `×2` rozeti** (`.k2-badge`, lacivert chip; `.clue-k2-cell`'e `padding-top` ile metin rozetin altında). Puanlama tek yoldan: `cellPoints(id)` ve `wordPoints(wid)` → hem oyuncu hem rakip. *(Not: prototip `cengel-oyunu` bu özelliği içermez.)*
- **Soru hücresi:** dokununca `scale(1.42)` büyür (`activeClue`). **X (çift soru) hücresi:** iki soru ortalı, oklar (▶ üst-sağ, ▼ alt-orta) yarım-kutu dışında render edilir (kırpılmaz).
- **Oyun sonu:** tüm hücreler kilitlenince ~3.2s sonra `gameOver=true`. `.result-overlay` **cam kart** ("You won!"/"Not this time"/"It's a tie!"). **SEVİYE BONUSU (kazanınca):** medium ×1.08, hard ×1.10 (easy yok) → puan sayaçla **80→86** artar + "**+N seviye puanı**" yukarıdan kayarak iner (`levelBonus`, `shownScore`); skor tablosuna **bonuslu** skor gönderilir.
- **Soru yazısı auto-fit:** `AutoFitText` bileşeni soru metnini kutusuna sığmazsa font'u kademeli küçültür (6px tabanına kadar), resize/döndürmede yeniden sığdırır. X (çift soru) hücrelerindeki uzun kelimeler kesilmez (line-clamp kaldırıldı).
- **Renk uyumu:** tek mavi accent (`--placed-bg:#4c8dff` / `--accent-gradient`) — TR logosu, oyuncu skoru, ONAYLA butonu, onaylı taş hep bu.
- **Bağlantı hatası:** fetch başarısızsa geliştirici mesajı yerine kullanıcı dostu **cam hata ekranı** (📡 + "İnternet bağlantınız…" + Tekrar Dene/Menüye Dön — `.conn-error`).
- **Kalıcılık:** `localStorage` `cengel_save_<level>_<puzzleId>` (taşlar, raf, skorlar, kilitler, gameOver). Yeni gün/seviye = taze oyun.

## 🎯 PUANLAMA (her iki oyun, 0–100 ölçeği)
- **Günlük Düello:** doğru harf +1 (H²→+2, H³→+3), tamamlanan kelime +uzunluk (K² ×2), yanlış −1; 0 tabanlı. **Kazanınca seviye bonusu:** medium ×1.08, hard ×1.10.
- **Kutu Kutu Pense** (`App.jsx checkWin`): `puan = (toplam harf×1) − (ipucu×2) + süre(±10)` × **kategori çarpanı** (a1_a2 ×1.00, b1_b2 ×1.08, c1_c2/academic ×1.10). süre: <04:00 +10, >07:00 −10. Üst sınır yok, 0 tabanlı. Kazanma ekranında **döküm** (`scoreBreakdown`: Harf/İpucu/Süre). `highScores` artık harf-bazlı (~150 altı); eski 1000+ rekorlar `>300` ise tek seferde temizlenir.

## 🏆 Skor Tablosu (leaderboard) — Upstash + serverless
**İKİ oyun tek tabloda** (duello + pense). **Şifresiz** kimlik (takma ad + cihaz anahtarı).
- **Backend (`api/`, Vercel serverless, ek bağımlılık YOK — Upstash REST'e `fetch`):**
  - `api/_store.js`: Upstash REST yardımcıları, İstanbul tarihi/ISO-hafta, `LEVELS` (duello: easy/medium/hard), `PENSE_LEVELS` (a1_a2/b1_b2/c1_c2/academic), `GAMES={duello,pense}`, TTL. Env: `UPSTASH_*` **veya** `KV_REST_API_*`.
  - `api/register.js`: nick benzersizleştirme + `_badwords.js` uygunsuz nick filtresi.
  - `api/submit.js`: `{deviceKey, game, level, score}` (score 0–100'e **kırpılır**). Gün hash alanı `<game>:<level>`, en iyi tutulur. **Oyun günlüğü = o oyunun oynanan alt-skorlarının ortalaması**; **Genel günlük = oynanan OYUN TÜRLERİNİN ortalaması** `(duelloDaily+penseDaily)/oynanan` (1 veya 2'ye böler, tur sayısına DEĞİL) → `lb:day` ZSET. **Haftalık = genel günlüklerin toplamı** (delta). Geri uyum: `game` yoksa seviyeden çıkarır.
  - `api/mydaily.js` (YENİ): `?device=` → `{duelloDaily, penseDaily, overallDaily}` (Kutu Pense kategori ekranında "Günlük ortalama puanınız" için).
  - `api/leaderboard.js`: `?type=day|week&device=` → ilk 20 + (dışındaysa) kendi sıran. **`Cache-Control: no-store`** (bayat skor gösterimi giderildi).
  - `api/admin.js`: `?token=ADMIN_TOKEN&action=remove&nick=`.
- **İstemci:** `src/utils/leaderboard.js` — `submitScore(game, level, score)` (kayıtsızsa sessiz atlar; fetch `no-store`), `fetchMyDaily()`, `fetchLeaderboard`. CengelGame → `submitScore('duello', level, bonusluSkor)`; Kelime Avcısı `checkWin` → `submitScore('pense', kategori, puan)`.
- **UI:** `src/Scoreboard.jsx`+`.css` (onboarding + Günlük/Haftalık tablo, modal). `src/ScoreboardPreview.jsx` **ANA EKRANDA** `limit={3}` (ilk-3 + ilk-3 dışındaysan **kendi satırın** `.sb-prow-self`) + "Tümünü Gör →".
- **Kurulum:** Vercel → Storage → Upstash Redis bağla (env'ler otomatik) → redeploy. Tablo **sadece canlıda** çalışır (Vite dev'de `/api` yok). Anonim olduğu için banlanan yeni nick'le dönebilir; asıl koruma önleyici filtre.

## Günlük bulmaca üretimi — `generator.js`
- **3 seviye üretir** (`LEVELS`, kademeli eşleme). Her seviyenin dosya listesi:
  - `easy` = `a1_a2.json` + `common_short.json`
  - `medium` = `a1_a2.json` + `b1_b2.json` + `common_short.json`
  - `hard` = `b1_b2.json` + `c1_c2.json` + `academic.json` + `common_short.json`
- **`common_short.json`** (≈1250 küratörlü yaygın kısa kelime, 3-6 harf) bu oturumda eklendi; her seviyede "harç". Özellikle hard'ın az olan kısa-kelime havuzunu besler (havuzlar: easy ~2900, medium ~4900, hard ~4900).
- **Köprü kelimeler (`FILLERS`, 27 adet 2 harfli)** her seviyede bulunur (b1_b2/c1_c2/academic'te 2 harfli kelime yok; bunlar olmazsa X şablonları tıkanır). `FILLER_SET` ile cooldown'dan **muaf**tır.
- Sözlükler `src/data/`'dan okunur (format: `{en, tr}`). Türkçe `toLocaleUpperCase('tr-TR')`. **Element sembolleri elenir** (`/SİMGES/`). Kelimeler `en` bazında benzersizleştirilir. **Çok-kelime:** `en` `[^A-Z]` ile boşluksuzlaşır (ipucu `tr` boşluklu kalır) → cevap birleşik. Sayılar (~): a1_a2 1762, b1_b2 2342, c1_c2 1414, academic 617.
  - **Veri içe aktarım dersi:** `kelimelistesi.xlsx` (üst=İng, alt=Tr alternatif) içe aktarıldı (+307). **DİKKAT:** alternatif listede bir kelimenin çevirisi eksikse (ör. "the") tüm eşleşme kayar → en/tr swap olur. İçe aktarımdan sonra **`en` sütununda Türkçe karakter var mı** diye doğrula (0 olmalı). Bozuk/kısaltılmış çeviriler elle düzeltilir (ör. revise=gözden geçirmek, overlook=göz ardı etmek).
- **Çıktı = KUYRUK/TAMPON (`BUFFER_DAYS=7`):** Her `daily-<level>.json` artık tek gün değil, `{ level, generated, puzzles: [...] }` formatında **7 günlük** kuyruk tutar (bugün + 6 ileri gün). Geri uyum için `daily.json` = **bugünün** medium'u (tek obje). Uygulama yine `fetch('/puzzles/daily-<level>.json')` çeker, içinden bugünü seçer.
  - **Neden:** Kullanıcıya görünen "bugün" cron'un ne zaman koştuğundan **bağımsız** olsun. Dosyada bugün hazır beklediği için 00:00'da uygulama **hiç beklemeden** açılır; GitHub cron gecikse/atlasa bile (tampon < boşluk olmadıkça) kimse boşluk görmez.
  - **Kendini onarır + idempotent:** Her koşu `targetDates=[bugün..bugün+6]` için eksik günleri üretir, **var olanları yeniden üretmez** (`loadExistingPuzzles` ile okur). Geçmiş günler `targetDates`'te olmadığı için kuyruktan otomatik düşer. Cron birkaç gece atlasa bir sonraki koşu boşlukları doldurur.
  - **Exit kodu:** Sadece **BUGÜN** herhangi bir seviyede üretilemezse `exit 1`. İleri gün eksiği tamponla tolere edilir (build kırılmaz).
  - `generatePuzzle(date, level)` artık dosya YAZMAZ; `{ puzzle, usedEn }` döndürür. Orkestratör kuyruğu toplayıp seviye başına tek dosya yazar.
- **Tekrar önleme (per-seviye):** `history.json` `{date, level, words}` tutar. Cooldown her seviye KENDİ geçmişiyle: `recentWordsForLevel(level, refDate)` o günün **kendi tarihinden** geriye `COOLDOWN_DAYS=60` günü sayar (kuyrukta her ileri gün KENDİ tarihine göre değerlendirilir; üretilen gün anında history'e eklenir ki sonraki günler tekrar etmesin). 2 harfli ve `FILLER_SET` muaf; level'sız eski kayıtlar tüm seviyelere sayılır.
- **Çift-soru güvencesi:** solver `usedClues` ile aynı bulmacada **aynı TR sorusunu 2 kez kullanmaz** (kelime çakışsa bile).
- **Şablon GÜNE GÖRE seçilir** (`dayIdx = floor(Date.parse(date)/86400000) % 5`): her gün sıradaki şablon, 5 günde başa döner. İlk 30 deneme günün şablonu; o seviyede tıkanırsa kalan denemeler diğer şablonlara düşer (üretim takılmaz). **Tüm seviyelerin aynı şablonu kullanma zorunluluğu YOK.**
- 5 şablon (8×8), `X`=çift yön. Hepsi: 0 orphan, 1-harf slot yok, çift-kapsama %55-57. Validator orphan/1-harf/bitişik-B'yi hata sayar; kapsama oranını raporlar. `letterPool` Fisher-Yates ile karışır.
- Tarih: `Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' })`.

### ⚠️ "Sahte sütun" sorunu — KAPANDI (tekrar uğraşma)
Şablonlarda alt alta yatay kelimelerin harfleri dikeyde sorusu olmayan "sahte sütun" oluşturur (col2/col6 ~8 hücre). Bunu yok etmek = "tam kesişimli ızgara" = klasik *word-square* problemi. **Bu 6k'lık iki dilli sözlükle ÇÖZÜLEMEZ** — ~2M deneme yapıldı (rastgele, kurgusal tam-kesişim, mutasyon, +1250 kelime sonrası), hepsi 0/0% çözüm. Karar: **mevcut şablonlar kalsın** (her hücrenin yatay sorusu var; standart çengel). Gerçek çözüm 10-100× büyük kısa-kelime DB + özel word-square algoritması ister (ayrı/büyük proje).

## İkonlar / PWA
- `public/bg.jpg` (~45 KB) — Günlük Düello'nun göl/iskele cam zemini (`.cengel-root::before`).
- `public/icon.svg` — ince monoline "WTR" logosu (mor gradyan), favicon + manifest kaynağı.
- `public/apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png` — SVG'den üretildi (iOS ana ekran + Android PWA).
- `public/manifest.webmanifest` (`display: standalone`) + `index.html`'de favicon/apple-touch/manifest/theme-color + `viewport-fit=cover` + `apple-mobile-web-app-status-bar-style: black-translucent`.
- `src/utils/MenuIcons.jsx` — menüdeki `PuzzleIcon` (çapraz bulmaca ızgarası) ve `DuelIcon` (çapraz kılıçlar); App.jsx'te emoji yerine kullanılır.
- **PWA güvenli alan (standalone):** `black-translucent` içeriği çentik/status bar altına alır → `.game-container` ve `.menu-screen` padding'lerinde `env(safe-area-inset-top/bottom)` kullanılır (çengel "← Geri" butonu status bar altında kalmasın). Alt boşluk için `.app-container/.menu-screen/.game-container` `min-height:100dvh`. SVG/PNG ikon üretimi: dış HTTPS bu ortamda kapalı (sertifika); PNG'ler tarayıcı canvas'ından üretildi.

## Otomatik yayın — `.github/workflows/daily-puzzle.yml`
- Cron `0 9 * * *` = 09:00 UTC = **12:00 TRT (sakin saat)**. `workflow_dispatch` ile elle de tetiklenir. **Kullanıcıya görünen oyunu cron DEĞİL, tarayıcı tarihi belirler** (7 günlük kuyruk + istemci tarih seçimi) → 00:00'da yeni oyun deploy/cron beklemeden gelir; cron sadece kuyruğu doldurur (gece yarısı kalabalığından kaçınmak için öğlene alındı).
- `node generator.js` → `public/puzzles/*.json` (3 seviye + daily.json + history.json) commit'ler → push → Vercel otomatik deploy.
- **Dayanıklı push:** checkout↔push arası remote kıpırdarsa (yarış) `git pull --rebase -X theirs` + 5 deneme; `fetch-depth: 0`. (İlk gece "fetch first" hatası yaşandı, bu yüzden eklendi.)
- **GEREKLİ AYAR:** GitHub repo → Settings → Actions → General → Workflow permissions → **Read and write permissions** (yoksa push adımı yetki hatasıyla patlar; repo ayarı tavandır, workflow `permissions:` bloğu tek başına yetmez).
- GitHub cron birkaç dk gecikebilir / nadiren atlar; atlarsa elle "Run workflow".
- **Canlı URL:** https://wordtr.vercel.app

## Git
- Commit kimliği bu repoda yerel olarak `yeswordno <yeswordno@gmail.com>` (doğru). Global ise `cevaplapp`.
- Bot/manuel üretim sonrası origin ilerler; **yeni commit'ten önce `git pull --rebase`** (yoksa push "rejected").
- Bot commit mesajı: `chore: günlük bulmaca <tarih>`, sadece `public/puzzles/*.json`'a dokunur.
