import { useState, useEffect } from 'react';
import './App.css';
import { generateCrossword, GRID_SIZE } from './utils/gameLogic';
import { Analytics } from "@vercel/analytics/react"

// JSON Verilerini İçe Aktar (Dosya yollarının senin projene uygun olduğundan emin ol)
import a1_a2 from './data/a1_a2.json';
import b1_b2 from './data/b1_b2.json';
import c1_c2 from './data/c1_c2.json';
import academic from './data/academic.json';
import { TrFlag, GbFlag } from './utils/FlagIcons';
import { SpeakerIcon } from './utils/SpeakerIcon';
import CengelGame from './CengelGame';

function App() {
  // --- STATE YÖNETİMİ ---
  const [screen, setScreen] = useState('lang'); // 'lang', 'level', 'game'
  const [showWinModal, setShowWinModal] = useState(false);
  const [mode, setMode] = useState('EN_TR');
  const [sourceWords, setSourceWords] = useState([]);

  // Hangi kelimelerin görsel ipucu gösterildi? (Tekrar göstermemek için)
  const [shownVisualsSet, setShownVisualsSet] = useState(new Set());

  // Geçici görsel popup state'i (Bunu zaten eklemiştin)
  const [tempVisual, setTempVisual] = useState(null);

  // Oyun Alanı Verileri
  const [solutionGrid, setSolutionGrid] = useState([]); // Cevap anahtarı
  const [gridData, setGridData] = useState([]); // Kullanıcı girişi
  const [placedWords, setPlacedWords] = useState([]); // Yerleşen kelimeler
  const [cursor, setCursor] = useState({ r: -1, c: -1 }); // İmleç
  const [selectedWord, setSelectedWord] = useState(null); // Seçili kelime

  const [hintsUsed, setHintsUsed] = useState(0);
  const [totalLetters, setTotalLetters] = useState(0);
  const [hintedWordsSet, setHintedWordsSet] = useState(new Set());

  const [timer, setTimer] = useState(0); // Süre sayacı
  const [isGameActive, setIsGameActive] = useState(false); // Oyun başladı mı?
  const [currentScore, setCurrentScore] = useState(0); // O anki puan
  const [isNewRecord, setIsNewRecord] = useState(false); // Rekor kırıldı mı?
  const [currentLevelKey, setCurrentLevelKey] = useState(''); // Hangi leveldayız?

  // Rekorları LocalStorage'dan çek
  const [highScores, setHighScores] = useState(() => {
    const saved = localStorage.getItem('wordHunter_highScores');
    return saved ? JSON.parse(saved) : {};
  });

  // Koleksiyon Verisi (LocalStorage'dan çekeceğiz)
  const [collection, setCollection] = useState(() => {
    const saved = localStorage.getItem('wordHunter_collection');
    return saved ? JSON.parse(saved) : { known: [], review: [] };
  });
  const [activeTab, setActiveTab] = useState('review');

  // Backspace (Silme) İkonu (SVG)
  const BackspaceIcon = () => (
    <svg viewBox="0 0 24 24" width="24" height="24">
      <path d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-3 12.59L17.59 17 14 13.41 10.41 17 9 15.59 12.59 12 9 8.41 10.41 7 14 10.59 17.59 7 19 8.41 15.41 12 19 15.59z"></path>
    </svg>
  );



  // --- SESLİ OKUMA MOTORU (TTS) ---
  const speakText = (text) => {
    if (!window.speechSynthesis) return;

    // Varsa eski konuşmayı durdur
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; // Daima İngilizce okuyacak
    utterance.rate = 0.9;     // Tane tane okunması için hız ayarı
    utterance.pitch = 1;

    // En kaliteli sesi bulma (Google, Siri vb.)
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice =>
      (voice.lang === 'en-US' || voice.lang === 'en_US') && (
        voice.name.includes('Google') ||
        voice.name.includes('Samantha') ||
        voice.name.includes('Daniel') ||
        voice.name.includes('Premium')
      )
    );

    if (preferredVoice) utterance.voice = preferredVoice;
    window.speechSynthesis.speak(utterance);
  };

  // Sesleri önceden yüklemeyi tetikle
  useEffect(() => {
    if (window.speechSynthesis) window.speechSynthesis.getVoices();
  }, []);

  // Klavye Tuşları
  // Klavye Düzeni
  const getKeyboardLayout = () => {
    // Mode 'TR_EN' ise (Türkçeden İngilizceye çeviri) -> Klavye İNGİLİZCE (QWERTY)
    // Mode 'EN_TR' ise (İngilizceden Türkçeye çeviri) -> Klavye TÜRKÇE (QWERTY + TR Karakterler)

    if (mode === 'TR_EN') {
      // Standart İngilizce QWERTY
      return [
        ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
        ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
        ["Z", "X", "C", "V", "B", "N", "M"] // Backspace render kısmında eklenecek
      ];
    } else {
      // Türkçe Klavye Düzeni (Wordle TR standardı: Q,W,X genelde olmaz ama klavye bütünlüğü için tutulabilir veya çıkarılabilir. 
      // Burada TR karakterlerin yoğunluğundan dolayı en uygun mobil düzeni kullanıyoruz)
      return [
        ["E", "R", "T", "Y", "U", "I", "O", "P", "Ğ", "Ü"], // Q ve W genelde TR kelime oyunlarında elenir ama yer açmak için çıkardık
        ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ş", "İ"],
        ["Z", "C", "V", "B", "N", "M", "Ö", "Ç"] // Backspace render kısmında eklenecek
      ];
    }
  };
  const keyboardRows = getKeyboardLayout();

  // --- OYUN BAŞLATMA ---
  const handleLangSelect = (m) => { setMode(m); setScreen('level'); };

  const handleLevelSelect = (lvl) => {
    let data;
    setCurrentLevelKey(lvl);
    switch (lvl) {
      case 'a1_a2': data = a1_a2; break;
      case 'b1_b2': data = b1_b2; break;
      case 'c1_c2': data = c1_c2; break;
      case 'academic': data = academic; break;
      default: data = [];
    }
    setSourceWords(data);
    startGame(data);
  };

  const startGame = (wordsData) => {
    setShowWinModal(false);
    setHintsUsed(0);
    setHintedWordsSet(new Set());
    setShownVisualsSet(new Set());
    setSelectedWord(null);
    setCursor({ r: -1, c: -1 });
    setTimer(0); // Süreyi sıfırla
    setIsGameActive(true); // Sayacı başlat
    setIsNewRecord(false); // Yeni oyun, rekor bayrağını indir

    const shuffled = [...wordsData].sort(() => 0.5 - Math.random());
    const selection = shuffled.slice(0, 40).map(item => {
      const rawAnswer = mode === 'EN_TR' ? item.tr : item.en;
      const rawClue = mode === 'EN_TR' ? item.en : item.tr;
      const clue = mode === 'TR_EN'
        ? rawClue.toLocaleUpperCase('tr') // Türkçe İpucu: i -> İ olur
        : rawClue.toUpperCase();          // İngilizce İpucu: i -> I olur

      if (!rawAnswer) return null;

      let clean = mode === 'TR_EN'
        ? rawAnswer.toUpperCase().replace(/[^A-Z]/g, '')
        : rawAnswer.toLocaleUpperCase('tr').replace(/[^A-ZÇĞİÖŞÜ]/g, '');

      return { answer: clean, clue: clue, original: item };
    }).filter(w => w && w.answer.length > 1 && w.answer.length <= GRID_SIZE);


    const result = generateCrossword(selection);
    if (result.placedWords.length < 4) { startGame(wordsData); return; } // Yeniden dene

    let count = 0;
    for (let r = 0; r < GRID_SIZE; r++) for (let c = 0; c < GRID_SIZE; c++) if (result.grid[r][c]) count++;
    setTotalLetters(count);
    setSolutionGrid(result.grid);
    setPlacedWords(result.placedWords);
    setGridData(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill("")));
    setScreen('game');
  };

  // --- OYUN MANTIĞI ---
  const handleCellClick = (r, c) => {
    // 1. Geçersiz alan kontrolü (AYNI)
    if (solutionGrid[r][c] === null) { setSelectedWord(null); setCursor({ r: -1, c: -1 }); return; }

    // 2. O kutudaki kelimeleri bul (AYNI)
    const wordsAtCell = placedWords.filter(w => {
      if (w.dir === 'across') return r === w.row && c >= w.col && c < w.col + w.answer.length;
      else return c === w.col && r >= w.row && r < w.row + w.answer.length;
    });
    if (wordsAtCell.length === 0) return;

    // 3. Hedef kelimeyi seç (AYNI)
    let target = wordsAtCell[0];
    if (selectedWord && wordsAtCell.length > 1) {
      if (selectedWord.index === wordsAtCell[0].index) {
        target = (cursor.r === r && cursor.c === c) ? wordsAtCell[1] : wordsAtCell[0];
      } else {
        target = wordsAtCell.some(w => w.index === selectedWord.index) ? selectedWord : wordsAtCell[0];
      }
    }

    // --- DEĞİŞİKLİK BURADA BAŞLIYOR ---

    // Eğer zaten seçili olan kelimenin bir harfine tıklıyorsak:
    // Otomatik olarak ilk boşluğa gitme, direkt kullanıcının tıkladığı yere git.
    if (selectedWord && selectedWord.index === target.index) {
      setSelectedWord(target);
      setCursor({ r, c }); // Tıklanan koordinat
      return; // Fonksiyonu burada bitir, aşağıya (otomatik aramaya) inme
    }

    // --- DEĞİŞİKLİK BURADA BİTİYOR ---

    // Eğer kelime YENİ seçiliyorsa: İlk boş kutuyu bul (ESKİ MANTIK DEVAM EDİYOR)
    setSelectedWord(target);

    let foundEmpty = false;
    for (let i = 0; i < target.answer.length; i++) {
      const tr = target.dir === 'across' ? target.row : target.row + i;
      const tc = target.dir === 'across' ? target.col + i : target.col;
      if (gridData[tr][tc] === "") { setCursor({ r: tr, c: tc }); foundEmpty = true; break; }
    }
    if (!foundEmpty) setCursor({ r, c });
  };

  const handleKeyInput = (key) => {
    if (!selectedWord || screen !== 'game') return;
    const { r, c } = cursor;

    // --- 1. SİLME İŞLEMİ (AYNEN KORUNDU) ---
    if (key === 'BACKSPACE') {
      const n = [...gridData.map(row => [...row])];
      const w = selectedWord;

      // Eğer kutu doluysa sadece içini sil
      if (n[r][c] !== "") {
        n[r][c] = "";
        setGridData(n);
      }
      // Eğer kutu boşsa bir önceki kutuya git ve orayı sil
      else {
        let prevR = r;
        let prevC = c;
        // Kelimenin yönüne göre bir geriye git
        if (w.dir === 'across') prevC = c - 1;
        else prevR = r - 1;

        // Kelimenin dışına çıkmıyorsak işlemi yap
        const canMoveBack = (w.dir === 'across' && prevC >= w.col) ||
          (w.dir === 'down' && prevR >= w.row);

        if (canMoveBack) {
          n[prevR][prevC] = ""; // Önceki kutuyu temizle
          setGridData(n);
          setCursor({ r: prevR, c: prevC }); // İmleci oraya taşı
        }
      }
      return;
    }

    // --- 2. HARF YAZMA VE AKILLI ATLAMA (BURASI YENİLENDİ) ---
    const n = [...gridData.map(row => [...row])];
    n[r][c] = key; // Harfi yaz
    setGridData(n);

    const w = selectedWord;

    // Şu anki harfin kelime içindeki sırasını bul (0, 1, 2...)
    let currentIdx = (w.dir === 'across') ? cursor.c - w.col : cursor.r - w.row;

    // Bir sonraki harfe bakmaya başla
    let nextIdx = currentIdx + 1;

    // --- AKILLI DÖNGÜ: Zaten doğru olanları atla ---
    while (nextIdx < w.answer.length) {
      // Hedeflenen sonraki kutunun koordinatları
      const nextR = w.dir === 'across' ? w.row : w.row + nextIdx;
      const nextC = w.dir === 'across' ? w.col + nextIdx : w.col;

      // Bu kutuda zaten DOĞRU harf var mı? (Cevap anahtarına bakıyoruz)
      const isAlreadyCorrect = gridData[nextR][nextC] === solutionGrid[nextR][nextC];

      if (isAlreadyCorrect) {
        // Evet doğru harf var, o zaman bunu geç (nextIdx'i artır)
        nextIdx++;
      } else {
        // Hayır, burası ya boş ya da yanlış. O zaman BURADA DUR.
        break;
      }
    }
    // --------------------------------------------------

    // Eğer kelime bitmediyse hesaplanan yeni konuma git
    if (nextIdx < w.answer.length) {
      if (w.dir === 'across') setCursor({ r: w.row, c: w.col + nextIdx });
      else setCursor({ r: w.row + nextIdx, c: w.col });
    }

    checkWin(n);
  };

  const giveHint = () => {
    if (!selectedWord) return;

    const visualFile = selectedWord.original.visual;


    // Görsel yoksa bu bloğa hiç girmez, direkt harfi açar.
    if (visualFile && !shownVisualsSet.has(selectedWord.answer)) {

      setTempVisual(visualFile); // Görseli göster
      setShownVisualsSet(prev => new Set(prev).add(selectedWord.answer)); // Listeye ekle

      // 2.5 saniye sonra kapat
      setTimeout(() => {
        setTempVisual(null);
      }, 2500);
    }
    if (!hintedWordsSet.has(selectedWord.answer)) {
      setHintedWordsSet(prev => new Set(prev).add(selectedWord.answer));
    }
    const w = selectedWord;
    const n = [...gridData.map(row => [...row])];
    let given = false;

    for (let i = 0; i < w.answer.length; i++) {
      const r = w.dir === 'across' ? w.row : w.row + i;
      const c = w.dir === 'across' ? w.col + i : w.col;
      if (n[r][c] !== w.answer[i]) {
        n[r][c] = w.answer[i]; given = true; setHintsUsed(prev => prev + 1);
        setGridData(n); setCursor({ r, c }); break;
      }
    }
    if (given) checkWin(n);
  };

  const checkWin = (currentGrid) => {
    let win = true;

    for (let w of placedWords) {
      for (let i = 0; i < w.answer.length; i++) {
        const r = w.dir === 'across' ? w.row : w.row + i;
        const c = w.dir === 'across' ? w.col + i : w.col;
        if (currentGrid[r][c] !== w.answer[i]) { win = false; break; }
      }
      if (!win) break;
    }

    if (win) {
      setIsGameActive(false); // ✅ DOĞRUSU BURADA: Sadece kazanınca durdur.

      let rawScore = 1000 + (totalLetters * 10) - (timer * 1) - (hintsUsed * 15);
      if (rawScore < 0) rawScore = 0;

      setCurrentScore(rawScore);

      const oldBest = highScores[currentLevelKey] || 0;
      if (rawScore > oldBest) {
        setIsNewRecord(true);
        const newScores = { ...highScores, [currentLevelKey]: rawScore };
        setHighScores(newScores);
        localStorage.setItem('wordHunter_highScores', JSON.stringify(newScores));
      }
      processGameResult();
      setTimeout(() => setShowWinModal(true), 500);
    }
  };

  const getCellClass = (r, c) => {
    if (solutionGrid[r][c] === null) return 'cell';
    let classes = 'cell playable';
    if (selectedWord) {
      const w = selectedWord;
      const isAcross = w.dir === 'across';
      if ((isAcross && r === w.row && c >= w.col && c < w.col + w.answer.length) ||
        (!isAcross && c === w.col && r >= w.row && r < w.row + w.answer.length)) {
        classes += ' highlighted';
      }
    }
    if (cursor.r === r && cursor.c === c) classes += ' active';
    if (gridData[r][c] !== "") classes += (gridData[r][c] === solutionGrid[r][c] ? ' correct' : ' wrong');
    return classes;
  };

  useEffect(() => {
    const kd = (e) => {
      if (screen !== 'game') return;
      let k = e.key;
      if (k === 'Backspace') { handleKeyInput('BACKSPACE'); return; }
      if (mode === 'TR_EN') {
        k = k.toUpperCase(); if ("QWERTYUIOPASDFGHJKLZXCVBNM".includes(k)) handleKeyInput(k);
      } else {
        k = k.toLocaleUpperCase('tr'); if ("ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ".includes(k)) handleKeyInput(k);
      }
    };
    window.addEventListener('keydown', kd); return () => window.removeEventListener('keydown', kd);
  }, [screen, cursor, selectedWord, gridData, mode]);

  useEffect(() => {
    let interval = null;
    if (isGameActive && screen === 'game') {
      interval = setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isGameActive, screen]);

  // Süreyi 01:23 formatına çeviren yardımcı fonksiyon
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };


  // Kelimenin tamamlanıp tamamlanmadığını kontrol eden yardımcı değişken
  const isWordFinished = () => {
    if (!selectedWord) return false;
    for (let i = 0; i < selectedWord.answer.length; i++) {
      const r = selectedWord.dir === 'across' ? selectedWord.row : selectedWord.row + i;
      const c = selectedWord.dir === 'across' ? selectedWord.col + i : selectedWord.col;
      // Eğer griddeki harf, cevap anahtarıyla uyuşmuyorsa bitmemiş demektir
      if (gridData[r][c] !== selectedWord.answer[i]) return false;
    }
    return true;
  };

  // Ses butonu aktif mi?
  // Kural: Mod EN_TR ise her zaman aktif. Mod TR_EN ise sadece kelime bitince aktif.
  const canPlayAudio = selectedWord && (mode === 'EN_TR' || isWordFinished());

  // --- KAYIT FONKSİYONU ---
  const processGameResult = () => {
    // Mevcut koleksiyonun kopyasını al
    setCollection(prevCollection => {
      const newCollection = { ...prevCollection };
      let hasChanges = false;

      placedWords.forEach(word => {
        // Kelime zaten var mı?
        const isInKnown = newCollection.known.some(w => w.en === word.original.en);
        const isInReview = newCollection.review.some(w => w.en === word.original.en);

        if (!isInKnown && !isInReview) {
          hasChanges = true;
          // İpucu kullanıldıysa 'review', kullanılmadıysa 'known' listesine
          if (hintedWordsSet.has(word.answer)) {
            newCollection.review.push(word.original);
          } else {
            newCollection.known.push(word.original);
          }
        }
      });

      // Sadece değişiklik varsa LocalStorage'a yaz (Performans için)
      if (hasChanges) {
        localStorage.setItem('wordHunter_collection', JSON.stringify(newCollection));
      }

      return newCollection;
    });
  };

  return (
    <div className="app-container">
      <Analytics />
      {/* 1. DİL EKRANI */}
      {screen === 'lang' && (
        <div className="menu-screen">
          <div className="logo-icon">🧩</div>
          <h1 className="app-title">Kelime Avcısı</h1>

          {/* BUTON 1: İngilizce -> Türkçe */}
          <button className="btn-main btn-lang" onClick={() => handleLangSelect('EN_TR')}>
            <div className="lang-icon-wrapper"><GbFlag /></div>
            <span>İngilizce</span>
            <span className="arrow">➔</span>
            <div className="lang-icon-wrapper"><TrFlag /></div>
            <span>Türkçe</span>
          </button>

          {/* BUTON 2: Türkçe -> İngilizce */}
          <button className="btn-main btn-lang" onClick={() => handleLangSelect('TR_EN')}>
            <div className="lang-icon-wrapper"><TrFlag /></div>
            <span>Türkçe</span>
            <span className="arrow">➔</span>
            <div className="lang-icon-wrapper"><GbFlag /></div>
            <span>İngilizce</span>
          </button>

          {/* BUTON 3: Günlük Çengel Bulmaca */}
          <button className="btn-main btn-lang" onClick={() => setScreen('daily')}>
            <span style={{ fontSize: '1.3rem' }}>🧩</span>
            <span>Günlük Bulmaca</span>
          </button>
        </div>
      )}

      {/* GÜNLÜK ÇENGEL BULMACA EKRANI */}
      {screen === 'daily' && (
        <CengelGame onBack={() => setScreen('lang')} />
      )}

      {/* 2. SEVİYE EKRANI */}
      {screen === 'level' && (
        <div className="menu-screen">
          <h2 className="screen-title">Zorluk Seç</h2>

          {/* A1 & A2 BUTONU */}
          <button className="btn-main btn-level" onClick={() => handleLevelSelect('a1_a2')}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2' }}>
              <span>⭐️ A1 & A2</span>
              {highScores['a1_a2'] > 0 && (
                <span className="highscore-badge">En İyi: {highScores['a1_a2']}</span>
              )}
            </div>
          </button>

          {/* B1 & B2 BUTONU */}
          <button className="btn-main btn-level" onClick={() => handleLevelSelect('b1_b2')}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2' }}>
              <span>🚀 B1 & B2</span>
              {highScores['b1_b2'] > 0 && (
                <span className="highscore-badge">En İyi: {highScores['b1_b2']}</span>
              )}
            </div>
          </button>

          {/* C1 & C2 BUTONU */}
          <button className="btn-main btn-level" onClick={() => handleLevelSelect('c1_c2')}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2' }}>
              <span>🔥 C1 & C2</span>
              {highScores['c1_c2'] > 0 && (
                <span className="highscore-badge">En İyi: {highScores['c1_c2']}</span>
              )}
            </div>
          </button>

          {/* AKADEMİK BUTONU */}
          <button className="btn-main btn-level" onClick={() => handleLevelSelect('academic')}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2' }}>
              <span>🎓 Akademik</span>
              {highScores['academic'] > 0 && (
                <span className="highscore-badge">En İyi: {highScores['academic']}</span>
              )}
            </div>
          </button>

          <button className="btn-main btn-collection" onClick={() => setScreen('collection')}>
            🗂 Kelime Koleksiyonum
          </button>
          <button className="btn-back" onClick={() => setScreen('lang')}>⬅ Geri Dön</button>
        </div>
      )}

      {/* 3. OYUN EKRANI */}
      {screen === 'game' && (
        <div id="game-screen">

          {/* MOBİL ÜST BAR (Masaüstünde CSS ile gizlenir) */}
          {/* MOBİL ÜST BAR */}
          <div className="mobile-top-bar">

            {/* SOL GRUP: Butonlar */}
            <div style={{ display: 'flex', gap: '8px' }}>

              {/* 1. İpucu Butonu */}
              <button className="btn-circle btn-hint" onClick={giveHint} disabled={!selectedWord}>💡</button>

              {/* 2. YENİ SES BUTONU (Artık kutunun dışında) */}
              <button
                className="btn-circle btn-audio-mobile" // Yeni sınıf adı verdik
                onClick={(e) => {
                  e.stopPropagation();
                  if (canPlayAudio) {
                    const textToRead = mode === 'EN_TR' ? selectedWord.clue : selectedWord.answer;
                    speakText(textToRead);
                  }
                }}
                disabled={!canPlayAudio} // Eğer dinlenemiyorsa disabled olsun
              >
                {/* Kilitliyse Kilit, değilse Hoparlör İkonu */}
                {!canPlayAudio && mode === 'TR_EN' ? '🔒' : <SpeakerIcon />}
              </button>
              <div className="timer-badge">⏱ {formatTime(timer)}</div>

            </div>

            {/* ORTA: Metin Kutusu (Artık içi temiz) */}
            <div className="mobile-clue-box">
              <span className="mobile-clue-text">
                {selectedWord ? selectedWord.clue : "Kelime Seç"}
              </span>
            </div>

            {/* SAĞ: Kapat Butonu */}
            <button className="btn-circle btn-close" onClick={() => setScreen('level')}>✕</button>
          </div>

          {/* OYUN ALANI (BOARD) */}
          <div className="board-area">
            <div className="grid-wrapper">
              <div className="grid" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
                {gridData.map((row, r) => row.map((_, c) => (
                  <div key={`${r}-${c}`} className={getCellClass(r, c)} onClick={() => handleCellClick(r, c)}>
                    {gridData[r][c]}
                  </div>
                )))}
              </div>
            </div>
          </div>

          {/* SAĞ PANEL (Masaüstünde Kart, Mobilde Sadece Klavye) */}
          <div className="right-panel-container">

            {/* Masaüstü Bilgi Kartı (CSS ile Mobilde gizlenir) */}
            <div className="desktop-info-card">
              <div className="desk-header">
                <div>
                  <h3 style={{ margin: 0 }}>Kelime Kartı</h3>
                  {/* --- YENİ EKLENEN SÜRE BİLGİSİ --- */}
                  <span style={{ fontSize: '0.85rem', color: '#636e72', fontWeight: '600' }}>
                    Süre: {formatTime(timer)}
                  </span>
                </div>
                <button className="btn-close-desk" onClick={() => setScreen('level')}>✕</button>
              </div>

              <div className="desk-clue-area">

                {/* 1. KISIM: İKON VE YÖNLENDİRME */}
                <div className="desk-flag-icon">
                  {!selectedWord ? (
                    <span style={{ fontSize: '3rem' }}>👆</span>
                  ) : (
                    // Eğer EN_TR ise (İngilizceden Türkçeye) -> Hedef dil Türkçe Bayrağı
                    // Eğer TR_EN ise (Türkçeden İngilizceye) -> Hedef dil İngiliz Bayrağı
                    mode === 'EN_TR' ? <TrFlag /> : <GbFlag />
                  )}
                </div>

                <div className="desk-instruction">
                  {!selectedWord
                    ? "Bir kutuya tıkla"
                    : (mode === 'EN_TR' ? "TÜRKÇESİNİ YAZ" : "İNGİLİZCESİNİ YAZ")
                  }
                </div>

                {/* 2. KISIM: SORU (İPUCU) */}
                <div className="desk-text">
                  {selectedWord ? selectedWord.clue : "..."}
                </div>

                {/* 3. KISIM: SES BUTONU */}
                {selectedWord && (
                  <button
                    className="btn-speak-desk"
                    disabled={!canPlayAudio}
                    onClick={() => {
                      const textToRead = mode === 'EN_TR' ? selectedWord.clue : selectedWord.answer;
                      speakText(textToRead);
                    }}
                    style={{
                      opacity: canPlayAudio ? 1 : 0.6,
                      cursor: canPlayAudio ? 'pointer' : 'not-allowed',
                      filter: canPlayAudio ? 'none' : 'grayscale(100%)',
                      borderColor: canPlayAudio ? 'var(--accent-purple)' : '#ccc',
                      color: canPlayAudio ? 'var(--accent-purple)' : '#999',
                      marginTop: '10px',
                      marginBottom: '10px'
                    }}
                  >
                    {!canPlayAudio && mode === 'TR_EN' ? (
                      <>🔒 Önce Çöz</>
                    ) : (
                      <>
                        <SpeakerIcon />
                        <span>Telaffuzu Dinle</span>
                      </>
                    )}
                  </button>
                )}

                {/* 4. KISIM: İPUCU BUTONU (Daha minimal) */}
                <button className="btn-hint-text" onClick={giveHint} disabled={!selectedWord}>
                  💡 Harf İpucu Al ({hintsUsed})
                </button>

              </div>
            </div>

            {/* Klavye (Her yerde görünür) */}
            {/* Klavye */}
            {/* --- App.jsx KLAVYE BÖLÜMÜ --- */}

            <div className="keyboard-container">
              {keyboardRows.map((row, rowIndex) => {

                // --- İÇERİ GİRİNTİ (INDENTATION) MANTIĞI ---
                // Klasik klavye hissi için satır başlarına boşluk ekliyoruz.

                let leftSpacer = null;
                let rightSpacer = null;

                // İNGİLİZCE KLAVYE (QWERTY)
                if (mode === 'TR_EN') {
                  // 2. Satır (A-L): Yarım tuş içeriden başlasın (Klasik görünüm)
                  if (rowIndex === 1) {
                    leftSpacer = <div className="kb-spacer" />;
                    rightSpacer = <div className="kb-spacer" />;
                  }
                  // 3. Satır (Z-M): Sol tarafı Backspace kadar boşlukla dengele
                  if (rowIndex === 2) {
                    leftSpacer = <div className="kb-spacer-wide" />;
                  }
                }

                // TÜRKÇE KLAVYE (TR)
                else {
                  // Türkçe'de 2. Satır (A-İ) 11 tuşla çok geniş olduğu için,
                  // 1. Satırı (E-Ü) yarım tuş içeri itiyoruz ki 'A', 'E' ile 'R' arasına denk gelsin.
                  if (rowIndex === 0) {
                    leftSpacer = <div className="kb-spacer" />;
                    rightSpacer = <div className="kb-spacer" />;
                  }
                  // 3. Satır (Z-Ç): Sol tarafı Backspace kadar boşlukla dengele
                  if (rowIndex === 2) {
                    leftSpacer = <div className="kb-spacer-wide" />;
                  }
                }

                return (
                  <div key={rowIndex} className="kb-row">

                    {/* Sol Boşluk (Varsa) */}
                    {leftSpacer}

                    {/* Tuşlar */}
                    {row.map((k) => (
                      <button
                        key={k}
                        className="kb-key"
                        onClick={(e) => {
                          e.preventDefault();
                          e.currentTarget.blur();
                          handleKeyInput(k);
                        }}
                        translate="no"
                      >
                        {k}
                      </button>
                    ))}

                    {/* 3. Satırın Sonuna Backspace Ekle */}
                    {rowIndex === 2 && (
                      <button
                        className="kb-key wide"
                        onClick={(e) => {
                          e.preventDefault();
                          e.currentTarget.blur();
                          handleKeyInput('BACKSPACE');
                        }}
                      >
                        <BackspaceIcon />
                      </button>
                    )}

                    {/* Sağ Boşluk (Varsa) */}
                    {rightSpacer}
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )
      }

      {/* KAZANMA MODALI */}
      {
        showWinModal && (
          <div className="modal">
            <div className="modal-box">
              <h2 style={{ color: 'var(--correct)', marginBottom: '15px' }}>Tebrikler! 🎉</h2>

              {/* --- 1. YENİ BÖLÜM: PUAN KARTI --- */}
              <div className="score-card-hero">
                <div className="score-label">TOPLAM PUAN</div>
                <div className="score-number">{currentScore}</div>

                {/* Rekor Kırıldıysa Göster */}
                {isNewRecord && <div className="new-record-badge">🏆 YENİ REKOR!</div>}

                {/* Süre Bilgisi */}
                <div className="score-time">⏱ Süre: {formatTime(timer)}</div>
              </div>

              {/* --- 2. MEVCUT BÖLÜM: DETAYLAR (Yan Yana Kutular Halinde) --- */}
              <div className="stats-grid">
                {/* Yüzdelik Kutu */}
                <div className="stat-box">
                  <div className="stat-value">
                    %{Math.round((Math.max(0, totalLetters - hintsUsed) / totalLetters) * 100)}
                  </div>
                  <div className="stat-label">Doğruluk</div>
                </div>

                {/* Harf Sayısı Kutusu */}
                <div className="stat-box">
                  <div className="stat-value">
                    {Math.max(0, totalLetters - hintsUsed)}/{totalLetters}
                  </div>
                  <div className="stat-label">Harf</div>
                </div>
              </div>

              {/* --- 3. MEVCUT BÖLÜM: KELİME LİSTESİ (Aynı kalıyor) --- */}
              <div className="word-review-list">
                <h4 style={{ margin: '10px 0 5px 0', color: '#2d3436' }}>Kelime Listesi</h4>
                <div className="review-scroll">
                  {placedWords.map((w, index) => (
                    <div key={index} className="review-item">
                      <span className="lang-en">{w.original.en}</span>
                      <span className="divider">=</span>
                      <span className="lang-tr">{w.original.tr}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Butonlar (Aynı kalıyor) */}
              <div className="modal-buttons">
                <button className="btn-main btn-lang" onClick={() => startGame(sourceWords)} style={{ justifyContent: 'center', width: '100%', margin: '0' }}>
                  Tekrar Oyna
                </button>
                <button
                  className="btn-back"
                  style={{
                    marginTop: '15px',
                    fontSize: '0.9rem',
                    background: '#f1f2f6',
                    border: 'none',
                    color: '#2d3436'
                  }}
                  onClick={() => {
                    setShowWinModal(false);
                    setScreen('level');
                  }}
                >
                  Ana Menüye Dön
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* 4. KOLEKSİYON EKRANI (iOS Style) */}
      {
        screen === 'collection' && (
          <div className="collection-screen">

            {/* Header */}
            <div className="collection-header">
              <h2 className="coll-title">Koleksiyonum</h2>
              <button className="btn-close-coll" onClick={() => setScreen('lang')}>✕</button>
            </div>

            {/* Sekmeler (Segmented Control) */}
            <div className="tab-area">
              <div className="segmented-control">
                <button
                  className={`segment-btn ${activeTab === 'known' ? 'active' : ''}`}
                  onClick={() => setActiveTab('known')}
                >
                  Hafızamda ({collection.known.length})
                </button>
                <button
                  className={`segment-btn ${activeTab === 'review' ? 'active' : ''}`}
                  onClick={() => setActiveTab('review')}
                >
                  Geliştirilecek ({collection.review.length})
                </button>
              </div>
            </div>

            {/* Liste Alanı */}
            <div className="coll-list-container">

              {/* Seçili liste boşsa gösterilecek mesaj */}
              {collection[activeTab].length === 0 ? (
                <div className="empty-state">
                  <div style={{ fontSize: '3rem', marginBottom: '10px' }}>
                    {activeTab === 'known' ? '🧠' : '🎯'}
                  </div>
                  <p>
                    {activeTab === 'known'
                      ? "Henüz hafızana attığın kelime yok."
                      : "Harika! Geliştirilecek kelime kalmadı."}
                  </p>
                </div>
              ) : (
                /* Dolu Liste (Tek bir beyaz kart içinde satırlar) */
                <div className="unified-list">
                  {collection[activeTab].map((item, i) => (
                    <div key={i} className="list-row" onClick={() => speakText(item.en)}>
                      <div className="row-text">
                        <span className="row-en">{item.en}</span>
                        <span className="row-tr">{item.tr}</span>
                      </div>

                      <button
                        className="row-speak-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          speakText(item.en);
                        }}
                      >
                        <SpeakerIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      }
      {/* --- GEÇİCİ GÖRSEL KATMANI (Overlay) --- */}
      {tempVisual && (
        <div className="visual-overlay">
          <div className="visual-popup-content">
            <img
              src={`/assets/${tempVisual}`}
              alt="Hint"
              className="visual-popup-img"
            />
          </div>
        </div>
      )}
    </div >
  );
}

export default App;