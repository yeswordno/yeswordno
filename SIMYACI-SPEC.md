# KELİME SİMYACISI — UYGULAMA SPEC'İ ⚗️

> Claude Code talimatı: **"SIMYACI-SPEC.md dosyasını oku ve uygula. Veri dosyası `simya-seed.json` hazır — repo'da `src/data/simya.json` olarak konumlandır, İÇERİĞİNİ DEĞİŞTİRME. Mevcut modlara (çengel, düello, kâbus) ve API şemasına dokunma; tek backend değişikliği `api/_store.js` GAMES'e `simya: ['daily', 'free']` eklemek."**

Yeni dosyalar: `src/SimyaGame.jsx`, `src/SimyaStage.jsx`, `src/SimyaGame.css`, `src/utils/simyaLogic.js`, `src/data/simya.json` (hazır seed), `generator-simya.js`, `tools/verify-simya.js`. Değişen: `src/App.jsx` (menü kartı + yönlendirme), `src/utils/MenuIcons.jsx` (CauldronIcon), `api/_store.js` (GAMES), `.github/workflows/daily-puzzle.yml` (bir adım).

---

## 1. Konsept

Oyuncu kelimeleri ezberlemez, **üretir**: anlam taşıyan parçaları (kelime/edat/kök/ek) kazanda birleştirerek İngilizce kelime "imal eder". Üç katman = üç rütbe:
- **Çırak (tier 1):** birleşik kelimeler (SUN+FLOWER)
- **Kalfa (tier 2):** phrasal verb'ler (GIVE+UP) — parçaların toplamından FARKLI anlam, "simyasal dönüşüm" anlatısının kalbi
- **Usta (tier 3):** Latin kökleri (EX+PORT)

## 2. Veri sözleşmesi (`src/data/simya.json` — seed hazır)

```
pieces[]: { id, text, tr, type: word|particle|prefix|suffix|root, tier }
combos[]: { en, parts[](sıralı piece id), tr, tier, hint, note? }
```
- **Geçerlilik kuralı:** Kazandaki parça dizisi, bir combo'nun `parts` dizisiyle SIRALI birebir eşleşirse geçerli. (EX+PORT ✓, PORT+EX ✗ — sıra önemli, oyuncuya öğretici.)
- `note`: keşif kartında gösterilen ilginç bilgi (BUTTERFLY = "tereyağı sineği" gibi).
- Hızlı arama için `simyaLogic.js` açılışta `Map<partsKey, combo>` kurar (`parts.join('+')` anahtar).
- Genişletme kuralı (koda yorum olarak): yeni kayıt SONA eklenir, id'ler asla değişmez (cooldown geçmişi en bazında tutulur).

## 3. İki alt mod

### 3A. GÜNLÜK KAZAN (`daily`) — leaderboard'lu, cron üretimli
- Her gün 8-10 parça verilir; bu parçalardan üretilebilen **6-8 hedef kelime** vardır.
- Her hedef için TR `hint` listelenir (sahne ipuçları paneli). Oyuncu parçaları birleştirerek hedefleri bulur.
- Hedef bulununca: kazan parlar, keşif kartı (EN + TR + parça analizi + varsa note), ipucu satırı ✓ işaretlenir.
- Geçerli ama HEDEF DIŞI bir combo üretirse: yine kabul + kodekse işlenir + küçük bonus ("Beklenmedik keşif! +5") — deneyciliği ödüllendir.
- Geçersiz birleşim: kazan tıslar (shake animasyonu), esprili mesaj havuzundan rastgele satır ("Simya buna izin vermiyor... ama merakını sevdim."). CAN/CEZA YOK — deneme ücretsiz, bu modun ruhu deneycilik.
- Süre yok; skor formülü:
  `score = round(bulunanHedef/toplamHedef*70 + min(bonusKeşif,3)*5 + (ipucusuzBulma ? 15 : ipucuAçmaOranına göre 0-15))`
  İpucu mekaniği: hedef satırları başta kilitli (sadece "? ? ?"), oyuncu isterse satıra dokunup hint'i açar; hiç açmadan bulursa tam puan.
- `submitScore('simya', 'daily', score)` — oturum sonunda bir kez.

### 3B. SERBEST ATÖLYE (`free`) — keşif/koleksiyon modu
- Oyuncunun rütbesine göre açılmış TÜM parçalar tezgâhta (tier kilidi: Kalfa = 20 keşif, Usta = 50 keşif).
- Amaç: kodeksi doldurmak. Aile ilerlemesi görünür: "PORT ailesi 3/6".
- Leaderboard'a skor GÖNDERMEZ (keşif sayısı zaten kodekste).

## 4. Kazan etkileşimi (mobil öncelikli — sürükleme DEĞİL, dokunma)

1. Alt tezgâhta parça kartları (tip bazlı renk: word=bakır, particle=yeşil, prefix=mor, suffix=turuncu, root=altın; renk + tip etiketi birlikte — sadece renge bel bağlama, erişilebilirlik).
2. Karta dokun → kazanın üstündeki 2-3 yuvaya sırayla yerleşir. Yuvadaki parçaya dokun → tezgâha geri döner. Yuvalar arası sıra değişimi: yuvaya uzun bas + diğerine dokun YERİNE basit çözüm: "↔" düğmesi ilk iki yuvayı takas eder (3 yuvada komşu takası).
3. "🔥 KAYNAT" düğmesi → değerlendirme → sonuç mizanseni.
4. Boş yuva varken KAYNAT pasif. Maks 3 yuva (seed'deki en uzun combo 3 parça).

## 5. Görsel yönerge (Kâbus'un zıt kutbu: sıcak atölye)

- Palet: zemin `#221406 → #3a2410` gradyan, bakır `#b87333`, alev turuncusu `#ff9f43`, parşömen `#f3e9d2`, mürekkep `#3e2c1c`.
- Kazan: inline SVG (bakır gövde, altında CSS alev animasyonu `@keyframes flame-flicker`, üstünde baloncuk pseudo-element'leri). Görsel dosya YOK, hepsi SVG/CSS.
- Başarılı kaynatma: kazandan yükselen ışık sütunu + keşif kartı parşömen stilinde açılır (`@keyframes scroll-unroll`).
- Geçersiz: yeşilimsi duman + kazan sallanır.
- Kodeks: parşömen dokulu (CSS gradyan) defter; aileler sekme sekme; keşfedilmemiş kelimeler "???" silüet.
- `prefers-reduced-motion`: tüm animasyonlar kapalı, sonuçlar anlık. WebAudio sfx: mevcut `src/utils/sfx.js`'e `bubble()` ve `poof()` eklenebilir (opsiyonel commit, kâbus ayarını bozmadan).

## 6. Kalıcılık

`localStorage['wordHunter_simya']` (try/catch'li parse):
```
{ discovered: { [en]: 'YYYY-MM-DD' }, dailyDone: { [date]: score }, sfx: bool }
```
- Rütbe `discovered` sayısından türetilir, ayrıca saklanmaz.
- Günlük kazan aynı gün ikinci kez açılırsa sonuç ekranı gösterilir (yeniden oynanmaz — düello ile tutarlı).
- Keşfedilen kelimeler İSTEĞE BAĞLI köprü: keşif kartında "Koleksiyona ekle" düğmesi → `wordHunter_collection.known`'a ekler (mevcut duplicate kontrolüyle). Otomatik EKLEME — oyuncu seçsin.

## 7. Günlük üretim (`generator-simya.js` + workflow)

- Mevcut generator.js'in KALIBI birebir: İstanbul tarihi, 7 günlük tampon kuyruk (`public/puzzles/simya/daily-YYYY-MM-DD.json` + bugün için `daily-simya.json`), history (`public/puzzles/simya/history.json`), seed'li RNG (mulberry32 + tarih hash — generator.js'ten kopyala).
- Günlük set kurma algoritması:
  1. Cooldown: combo 30 gün içinde hedef olduysa elenir (`COOLDOWN_DAYS_SIMYA = 30`; havuz 109 → 6-8 hedef/gün × 30 gün sınırda, bu yüzden emniyet supabı: aday < hedefSayısı×2 ise cooldown o koşuda 15'e iner + uyarı loglanır. Veri 200+'a çıkınca 60'a yükselt — koda TODO).
  2. Tier karışımı: her gün 4 t1 + 2 t2 + 1-2 t3 hedef (yeni oyuncu da ilerlemiş oyuncu da pay alır; t3 hedefleri ipucu panelinde "Usta sorusu" rozetiyle).
  3. Seçilen hedeflerin parçalarının BİRLEŞİMİ = günün parça seti. Parça seti 10'u aşarsa hedef değiştirerek (greedy: parça paylaşan hedefleri tercih et — aynı aileden 2 hedef = bedava sinerji) 8-10 aralığına in.
  4. JSON: `{ id: date, pieces: [piece id'leri], targets: [{ en, hint, tier }] }` — combo cevapları istemcide `simya.json`'dan doğrulanır, puzzle dosyasına TR/parts yazılmaz (dosya küçük kalır).
- Workflow: `daily-puzzle.yml`'e mevcut generator adımının yanına `node generator-simya.js` + verify adımı; commit adımı zaten `public/puzzles` klasörünü kapsıyorsa dokunma, kapsamıyorsa path ekle.
- `tools/verify-simya.js`: her kuyruk dosyası için (a) tüm target'lar combos'ta var, (b) targets'ın tüm parçaları pieces listesinde, (c) cooldown ihlali yok, (d) parça sayısı 8-10.

## 8. Onboarding ve App entegrasyonu

- Ana menü kartı: "⚗️ Kelime Simyacısı — Kelimeleri üret, ezberleme". `CauldronIcon` SVG.
- İlk açılışta 3 panelli hikâye (kâbus intro kalıbı yeniden kullanılabilirse ortak `IntroPanels` bileşenine çıkar — küçük refactor, iki mod da kullanır):
  1. "Kelimeler harflerden yapılmaz. Anlam parçalarından yapılır." (SUN+FLOWER görseli)
  2. "Bu atölyede onları üreteceksin. Bazen parçalar toplamından fazlasına dönüşür..." (GIVE+UP→vazgeçmek)
  3. "Çıraklıktan ustalığa: birleşikler → phrasal'lar → kadim kökler. Kazan hazır." + BAŞLA
- Giriş ekranı iki kapı: "🔥 Günlük Kazan" (varsa bugünkü skor rozetiyle) ve "🧪 Serbest Atölye" + "📜 Kodeks".

## 9. Kabul kriterleri

1. `node generator-simya.js && node tools/verify-simya.js` temiz; 7 günlük kuyruk doluyor; iki gün üst üste koşturunca (tarih mock'u ile) hedef tekrarı yok.
2. Günlük kazanda: hedef bulma ✓, hedef dışı geçerli combo bonusu ✓, geçersiz birleşim esprili mesajla reddediliyor, skor 0-100 ve bir kez gönderiliyor.
3. Parça sırası yanlışken (PORT+EX) birleşim reddediliyor.
4. Kodeks keşifleri localStorage'da kalıcı; bozuk localStorage uygulamayı çökertmiyor.
5. Tier kilidi çalışıyor (20/50 eşiklerinde Kalfa/Usta parçaları tezgâha geliyor) — günlük kazan kilitten MUAF (günün t2/t3 hedef parçaları o gün herkese açık, yoksa yeni oyuncu günlük bulmacayı bitiremez).
6. `prefers-reduced-motion` ve sessiz mod yolları çalışıyor; 375px genişlikte taşma yok.
7. `npm run build`, `npm run lint` temiz; mevcut üç modda regresyon yok (App.jsx diff'i minimal).
8. `_store.js` GAMES'e `simya: ['daily','free']` eklendi ama free skor GÖNDERMİYOR (yalnız daily).

## 10. Commit planı

1. `feat: simya veri seti + simyaLogic (saf fonksiyonlar: eşleşme, skor, rütbe)`
2. `feat: generator-simya + verify-simya + workflow adımı`
3. `feat: SimyaGame — günlük kazan akışı`
4. `feat: serbest atölye + kodeks + tier kilidi`
5. `feat: kazan görselleri/animasyonlar + intro panelleri (ortak IntroPanels refactor)`
6. `chore: GAMES'e simya + menü kartı`

## 11. Veri genişletme yol haritası (kod dışı — not)

- Faz 2 hedefi: t1 → 120, t2 → 80, t3 → 60 (toplam ~260; cooldown 60'a çıkar).
- Genişletme partileri Claude ile üretilip elle gözden geçirilecek; şema değişmez, dosya sonuna eklenir, `verify-simya.js` bütünlüğü denetler.
