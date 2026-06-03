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
- **Seviye save anahtarı:** `cengel_save_<level>_<puzzleId>` (her seviye ayrı ilerleme).

### Önemli davranışlar (CengelGame)
- **Renk teması:** monokrom temel (Rams × Ive) + **soru/pasif hücreler açık bal tonu** (`--clue-bg: #f4ead0`, `--empty-bg: #ebdcb8`). Harf hücreleri beyaz. Accent hâlâ antrasit. Değişkenler `.cengel-root`'ta.
- **Taş durumları:** raf taşı açık (`--tile-bg`), tahtaya konmuş-onaylanmamış **koyu** (`--placed-bg`), onaylanmış doğru **açık gri** (`--confirmed-bg`).
- **Skor anında işlenmez:** `+1/−1/+N` puanlar hücreden skor tablosuna **uçar** (`flyingPoints` + Web Animations API). Skor, uçuş bitince `landScore(who, value)` ile işlenir. Oyuncu skoru `Math.max(0, ...)` ile 0 tabanlı.
- **Yanlış harf:** köşede `−1` belirir, sonra **koyu taşı** rafa geri uçar (`flyingTiles`).
- **Rakip taşı uçar (yerleşme):** rakip hamlede taşlar **rakip skorundan hücreye** kademeli uçar (`flyingOppTiles`, `flyOppTileToCell`, ~880ms, 280ms arayla); inince hücre kilitlenir + `+1` skora uçar. Birden belirmez.
- **Rakip (medium AI):** oyuncudan ~3.5s sonra oynar, dağılım 1:%50 / 2:%35 / 3:%15. **Sadece harfi havuzda olan hücreleri doldurur** → oyuncunun eli asla "alakasız taş"a dönüşmez ve **oyuncu+rakip = boş hücre** her zaman tutar. Havuz boşsa (kalan harflerin hepsi oyuncuda) rakip pas geçer. Stale-closure'a karşı `poolRef/gridStateRef/oppLockedRef` kullanılır.
- **Taş sayısı:** raf, kalan boş hücre kadar dolar — `cap = min(5, kalanBoşHücre)`.
- **Soru hücresi:** dokununca `scale(1.42)` büyür (`activeClue`). **X (çift soru) hücresi:** iki soru ortalı, oklar (▶ üst-sağ, ▼ alt-orta) yarım-kutu dışında render edilir (kırpılmaz).
- **Oyun sonu:** tüm harf hücreleri kilitlenince ~1.9s sonra `gameOver=true`. `.result-overlay`: "You won!" / "Not this time" / "It's a tie!".
- **Kalıcılık:** `localStorage` `cengel_save_<level>_<puzzleId>` (taşlar, raf, skorlar, kilitler, gameOver). Yeni gün/seviye = taze oyun.

## Günlük bulmaca üretimi — `generator.js`
- **3 seviye üretir** (`LEVELS`, kademeli eşleme): `easy` = a1_a2 · `medium` = a1_a2+b1_b2 · `hard` = b1_b2+c1_c2+academic. **Köprü kelimeler (`FILLERS`, ~27 adet 2 harfli)** her seviyede bulunur (b1_b2/c1_c2/academic'te 2 harfli kelime yok; bunlar olmazsa X şablonları tıkanır).
- Sözlükler `src/data/`'dan okunur (format: `{en, tr}`). Türkçe `toLocaleUpperCase('tr-TR')`. **Element sembolleri elenir** (`/SİMGES/` → "CİVA SİMGESİ"=HG gibi tuhaf köprüler).
- Çıktı: **`public/puzzles/daily-<level>.json`** (easy/medium/hard) + geri uyum için `daily.json` = medium kopyası. Uygulama `fetch('/puzzles/daily-<level>.json')`.
- **Tekrar önleme (per-seviye):** `history.json` artık `{date, level, words}` tutar. Cooldown her seviye KENDİ geçmişiyle: son `COOLDOWN_DAYS=60` günde o seviyede kullanılan kelimeler elenir (2 harfli muaf; level'sız eski kayıtlar tüm seviyelere sayılır).
- **Şablon her DENEMEDE yeniden seçilir** (tek şablona kilitlenme yok). 5 şablon (8×8), `X`=çift yön. Hepsi: 0 orphan, 1-harf slot yok, çift-kapsama %55-57. Validator orphan/1-harf/bitişik-B'yi hata sayar; kapsama oranını raporlar. `letterPool` Fisher-Yates ile karışır.
- Tarih: `Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' })`.

## İkonlar / PWA
- `public/icon.svg` — ince monoline "WTR" logosu (mor gradyan), favicon + manifest kaynağı.
- `public/apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png` — SVG'den üretildi (iOS ana ekran + Android PWA).
- `public/manifest.webmanifest` + `index.html`'de favicon/apple-touch/manifest/theme-color linkleri.
- `src/utils/MenuIcons.jsx` — menüdeki `PuzzleIcon` (çapraz bulmaca ızgarası) ve `DuelIcon` (çapraz kılıçlar); App.jsx'te emoji yerine kullanılır.

## Otomatik yayın — `.github/workflows/daily-puzzle.yml`
- Cron `0 21 * * *` = 21:00 UTC = **00:00 TRT**. `workflow_dispatch` ile elle de tetiklenir.
- `node generator.js` → `public/puzzles/*.json` (3 seviye + daily.json + history.json) commit'ler → push → Vercel otomatik deploy.
- **GEREKLİ AYAR:** GitHub repo → Settings → Actions → General → Workflow permissions → **Read and write permissions** (yoksa push adımı yetki hatasıyla patlar; repo ayarı tavandır, workflow `permissions:` bloğu tek başına yetmez).
- GitHub cron birkaç dk gecikebilir / nadiren atlar; atlarsa elle "Run workflow".

## Git
- Commit kimliği bu repoda yerel olarak `yeswordno <yeswordno@gmail.com>` (doğru). Global ise `cevaplapp`.
- Bot/manuel üretim sonrası origin ilerler; **yeni commit'ten önce `git pull --rebase`** (yoksa push "rejected").
- Bot commit mesajı: `chore: günlük bulmaca <tarih>`, sadece `public/puzzles/*.json`'a dokunur.
