# yeswordno — Proje Notları (CLAUDE.md)

React + Vite kelime oyunu. Türkçe arayüz. Vercel'de yayında, GitHub: `yeswordno/yeswordno` (default branch: **master**).

## Çalıştırma
- `npm run dev` → Vite dev sunucusu
- `npm run build` → production build
- `node generator.js` → günlük çengel bulmacasını yeniden üretir (aşağıya bak)

## Oyun modları (giriş ekranı: `screen === 'lang'`)
`src/App.jsx` tek bir `screen` state'iyle ekran yönetir: `'lang' | 'level' | 'game' | 'collection' | 'daily'`.
Menüdeki sıra (lang ekranı):
1. **Kelime Avcısı** (başlık)
2. **⚔️ Günlük Düello** → `setScreen('daily')` → **seviye seçimi** (`dailyLevel`) → `<CengelGame level=... />` (çengel bulmaca)
3. İngilizce → Türkçe (mevcut oyun, `handleLangSelect('EN_TR')`)
4. Türkçe → İngilizce (`handleLangSelect('TR_EN')`)

> Mevcut "Kelime Avcısı" akışı (lang/level/game/collection) **bozulmamalı**. Çengel ayrı bir bileşendir.

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
- `App.jsx` `screen==='daily'` iken önce **seviye seçim ekranı** gösterir (😊 Kolay/Easy · 🙂 Orta/Medium · 🔥 Zor/Hard). Seçilince `<CengelGame level={dailyLevel} key={dailyLevel} onBack={()=>setDailyLevel(null)} />` render edilir (`key` → her seviye taze mount, state sıfırlama derdi yok).
- `CengelGame` `level` prop'una göre `fetch('/puzzles/daily-<level>.json')` çeker. Geri butonu "← Geri" → seviye seçimine döner.
- **Bulmaca dosyası artık KUYRUK formatı:** `{ level, generated, puzzles: [ {id:<tarih>, ...}, ... ] }` (7 günlük tampon). Fetch handler İstanbul tarihine göre **bugünün** kaydını seçer (`puzzles.find(id===today)` → yoksa `id<=today` en günceli → yoksa son eleman). **Eski tek-obje formatıyla geri uyumlu** (`raw.puzzles` yoksa `raw`'ı doğrudan kullanır) → deploy uyumsuzluğunda kırılmaz. Bkz. "Kuyruk/tampon" başlığı.
- **Seviye save anahtarı:** `cengel_save_<level>_<puzzleId>` (her seviye ayrı ilerleme).

### Önemli davranışlar (CengelGame)
- **Renk teması:** monokrom temel (Rams × Ive) + **soru/pasif hücreler açık bal tonu** (`--clue-bg: #f4ead0`, `--empty-bg: #ebdcb8`). Harf hücreleri beyaz. Accent hâlâ antrasit. Değişkenler `.cengel-root`'ta.
- **Taş durumları:** raf taşı açık (`--tile-bg`), tahtaya konmuş-onaylanmamış **koyu** (`--placed-bg`), onaylanmış doğru **açık gri** (`--confirmed-bg`).
- **Skor anında işlenmez:** `+1/−1/+N` puanlar hücreden skor tablosuna **uçar** (`flyingPoints` + Web Animations API). Skor, uçuş bitince `landScore(who, value)` ile işlenir. Oyuncu skoru `Math.max(0, ...)` ile 0 tabanlı.
- **Yanlış harf:** köşede `−1` belirir, sonra **koyu taşı** rafa geri uçar (`flyingTiles`).
- **Rakip taşı uçar (yerleşme):** rakip hamlede taşlar **rakip skorundan hücreye** kademeli uçar (`flyingOppTiles`, `flyOppTileToCell`, ~880ms, 280ms arayla); inince hücre kilitlenir + `+1` skora uçar. Birden belirmez.
- **Rakip (medium AI):** oyuncudan ~3.5s sonra oynar, dağılım 1:%30 / 2:%45 / 3:%25 (ort. ~1.95 taş/hamle). **Önce sadece harfi havuzda olan hücreleri doldurur** → oyuncunun eli "alakasız taş"a dönüşmez ve **oyuncu+rakip = boş hücre** tutarlı kalır. **Havuz hamleyi dolduramadığında** (oyun sonu yaklaşır, kalan harfler oyuncunun rafında) rakip kalanı **oyuncunun rafındaki harfe denk gelen hücreleri %60 (`CLAIM_PROB`) olasılıkla "kapayarak"** tamamlar (o taşı raftan düşürerek; 1 hücre + 1 taş → denge korunur) → son taşlar hep oyuncuya kalmaz, bitiş 3/2 gibi karışır. (Eski sürüm yalnız havuz TAMAMEN boşken kapıyordu; oyuncu son taşları tek hamlede koyup bitirdiği için tetiklenmiyordu.) Stale-closure'a karşı `poolRef/gridStateRef/oppLockedRef/rackRef` kullanılır.
- **Taş sayısı:** raf, kalan boş hücre kadar dolar — `cap = min(5, kalanBoşHücre)`.
- **Soru hücresi:** dokununca `scale(1.42)` büyür (`activeClue`). **X (çift soru) hücresi:** iki soru ortalı, oklar (▶ üst-sağ, ▼ alt-orta) yarım-kutu dışında render edilir (kırpılmaz).
- **Oyun sonu:** tüm harf hücreleri kilitlenince **~3.2s** sonra `gameOver=true` (son +1/+N puan uçuşları skora varıp işlensin, sonuç ondan sonra çıksın). `.result-overlay`: "You won!" / "Not this time" / "It's a tie!".
- **Soru yazısı auto-fit:** `AutoFitText` bileşeni soru metnini kutusuna sığmazsa font'u kademeli küçültür (6px tabanına kadar), resize/döndürmede yeniden sığdırır. X (çift soru) hücrelerindeki uzun kelimeler kesilmez (line-clamp kaldırıldı).
- **Renk uyumu:** `--placed-bg` (yerleştirilmiş taş, açık navy #54637d) aynı zamanda **TR logosu, oyuncu skoru ve ONAYLA butonu** için de kullanılır → tek değişkenle uyum.
- **Kalıcılık:** `localStorage` `cengel_save_<level>_<puzzleId>` (taşlar, raf, skorlar, kilitler, gameOver). Yeni gün/seviye = taze oyun.

## Günlük bulmaca üretimi — `generator.js`
- **3 seviye üretir** (`LEVELS`, kademeli eşleme). Her seviyenin dosya listesi:
  - `easy` = `a1_a2.json` + `common_short.json`
  - `medium` = `a1_a2.json` + `b1_b2.json` + `common_short.json`
  - `hard` = `b1_b2.json` + `c1_c2.json` + `academic.json` + `common_short.json`
- **`common_short.json`** (≈1250 küratörlü yaygın kısa kelime, 3-6 harf) bu oturumda eklendi; her seviyede "harç". Özellikle hard'ın az olan kısa-kelime havuzunu besler (havuzlar: easy ~2900, medium ~4900, hard ~4900).
- **Köprü kelimeler (`FILLERS`, 27 adet 2 harfli)** her seviyede bulunur (b1_b2/c1_c2/academic'te 2 harfli kelime yok; bunlar olmazsa X şablonları tıkanır). `FILLER_SET` ile cooldown'dan **muaf**tır.
- Sözlükler `src/data/`'dan okunur (format: `{en, tr}`). Türkçe `toLocaleUpperCase('tr-TR')`. **Element sembolleri elenir** (`/SİMGES/` → "CİVA SİMGESİ"=HG gibi tuhaf köprüler). Kelimeler `en` bazında benzersizleştirilir.
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
