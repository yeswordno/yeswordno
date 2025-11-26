import { useState, useEffect } from 'react';
import './App.css';
import { generateCrossword, GRID_SIZE } from './utils/gameLogic';

// JSON Verilerini İçe Aktar (Dosya yollarının senin projene uygun olduğundan emin ol)
import a1_a2 from './data/a1_a2.json';
import b1_b2 from './data/b1_b2.json';
import c1_c2 from './data/c1_c2.json';
import academic from './data/academic.json';
import { TrFlag, GbFlag } from './utils/FlagIcons';
import { SpeakerIcon } from './utils/SpeakerIcon';

function App() {
  // --- STATE YÖNETİMİ ---
  const [screen, setScreen] = useState('lang'); // 'lang', 'level', 'game'
  const [showWinModal, setShowWinModal] = useState(false);
  const [mode, setMode] = useState('EN_TR');
  const [sourceWords, setSourceWords] = useState([]);

  // Oyun Alanı Verileri
  const [solutionGrid, setSolutionGrid] = useState([]); // Cevap anahtarı
  const [gridData, setGridData] = useState([]); // Kullanıcı girişi
  const [placedWords, setPlacedWords] = useState([]); // Yerleşen kelimeler
  const [cursor, setCursor] = useState({ r: -1, c: -1 }); // İmleç
  const [selectedWord, setSelectedWord] = useState(null); // Seçili kelime

  const [hintsUsed, setHintsUsed] = useState(0);
  const [totalLetters, setTotalLetters] = useState(0);
  const [hintedWordsSet, setHintedWordsSet] = useState(new Set());

  // Koleksiyon Verisi (LocalStorage'dan çekeceğiz)
  const [collection, setCollection] = useState(() => {
    const saved = localStorage.getItem('wordHunter_collection');
    return saved ? JSON.parse(saved) : { known: [], review: [] };
  });

  // Koleksiyon ekranını açmak için
  const [showCollection, setShowCollection] = useState(false);

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
  const getKeyboardLayout = () => {
    if (mode === 'TR_EN') { // Hedef İngilizce
      return [
        "Q W E R T Y U I O P".split(" "),
        "A S D F G H J K L".split(" "),
        "Z X C V B N M".split(" ")
      ];
    } else { // Hedef Türkçe
      return [
        "E R T Y U I O P Ğ Ü".split(" "),
        "A S D F G H J K L Ş İ".split(" "),
        "Z C V B N M Ö Ç".split(" ")
      ];
    }
  };
  const keyboardRows = getKeyboardLayout();

  // --- OYUN BAŞLATMA ---
  const handleLangSelect = (m) => { setMode(m); setScreen('level'); };

  const handleLevelSelect = (lvl) => {
    let data;
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
    setSelectedWord(null);
    setCursor({ r: -1, c: -1 });

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
    if (solutionGrid[r][c] === null) { setSelectedWord(null); setCursor({ r: -1, c: -1 }); return; }

    const wordsAtCell = placedWords.filter(w => {
      if (w.dir === 'across') return r === w.row && c >= w.col && c < w.col + w.answer.length;
      else return c === w.col && r >= w.row && r < w.row + w.answer.length;
    });
    if (wordsAtCell.length === 0) return;

    let target = wordsAtCell[0];
    if (selectedWord && wordsAtCell.length > 1) {
      if (selectedWord.index === wordsAtCell[0].index) {
        target = (cursor.r === r && cursor.c === c) ? wordsAtCell[1] : wordsAtCell[0];
      } else {
        target = wordsAtCell.some(w => w.index === selectedWord.index) ? selectedWord : wordsAtCell[0];
      }
    }
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

    // --- BACKSPACE DÜZELTMESİ BAŞLANGIÇ ---
    if (key === 'BACKSPACE') {
      const n = [...gridData.map(row => [...row])];
      const w = selectedWord;

      // Durum 1: Mevcut kutu doluysa, sadece içeriği sil ve imleç orada kalsın
      if (n[r][c] !== "") {
        n[r][c] = "";
        setGridData(n);
      }
      // Durum 2: Mevcut kutu boşsa, bir önceki kutuya git ve orayı sil
      else {
        let prevR = r;
        let prevC = c;

        // Yöne göre bir önceki koordinatı belirle
        if (w.dir === 'across') {
          prevC = c - 1;
        } else {
          prevR = r - 1;
        }

        // Sınır Kontrolü: Kelimenin başlangıç noktasından daha geriye gitmemeli
        const canMoveBack = (w.dir === 'across' && prevC >= w.col) ||
          (w.dir === 'down' && prevR >= w.row);

        if (canMoveBack) {
          // Önceki kutuyu temizle
          n[prevR][prevC] = "";
          setGridData(n);
          // İmleci geriye taşı
          setCursor({ r: prevR, c: prevC });
        }
      }
      return;
    }
    // --- BACKSPACE DÜZELTMESİ BİTİŞ ---

    const n = [...gridData.map(row => [...row])];
    n[r][c] = key; setGridData(n);

    const w = selectedWord;
    let idx = (w.dir === 'across') ? cursor.c - w.col : cursor.r - w.row;
    if (idx + 1 < w.answer.length) {
      if (w.dir === 'across') setCursor({ r: w.row, c: w.col + idx + 1 });
      else setCursor({ r: w.row + idx + 1, c: w.col });
    }
    checkWin(n);
  };

  const giveHint = () => {
    if (!selectedWord) return;
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
    if (win) setTimeout(() => setShowWinModal(true), 500);
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

  // App.jsx'e ekleyin
  useEffect(() => {
    const handleResize = () => {
      if (screen === 'game' && window.innerWidth >= 1024) {
        // Masaüstü görünümünde grid'i yeniden boyutlandır
        const gridElement = document.querySelector('.grid');
        if (gridElement) {
          const container = gridElement.parentElement;
          const containerSize = Math.min(container.clientWidth, container.clientHeight);
          gridElement.style.width = `${containerSize - 60}px`; // Padding'i çıkar
          gridElement.style.height = `${containerSize - 60}px`;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    // İlk yüklemede de çalıştır
    setTimeout(handleResize, 100);

    return () => window.removeEventListener('resize', handleResize);
  }, [screen]);
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
  const saveToCollection = () => {
    const newCollection = { ...collection };

    placedWords.forEach(word => {
      // Kelime zaten listede var mı kontrol et (Tekrar eklemeyelim)
      const isInKnown = newCollection.known.some(w => w.en === word.original.en);
      const isInReview = newCollection.review.some(w => w.en === word.original.en);

      if (!isInKnown && !isInReview) {
        // İpucu kullanıldıysa 'review', kullanılmadıysa 'known' listesine
        if (hintedWordsSet.has(word.answer)) {
          newCollection.review.push(word.original);
        } else {
          newCollection.known.push(word.original);
        }
      }
    });

    setCollection(newCollection);
    localStorage.setItem('wordHunter_collection', JSON.stringify(newCollection));

    // Ana ekrana dön
    setShowWinModal(false);
    setScreen('level');
  };

  return (
    <div className="app-container">
      {/* 1. DİL EKRANI */}
      {screen === 'lang' && (
        <div className="menu-screen">
          <div className="logo-icon">🧩</div>
          <h1 className="app-title">Kelime Avcısı</h1>
          <button className="btn-main btn-lang" onClick={() => handleLangSelect('EN_TR')}>🇬🇧 İngilizce ➔ 🇹🇷 Türkçe</button>
          <button className="btn-main btn-lang" onClick={() => handleLangSelect('TR_EN')}>🇹🇷 Türkçe ➔ 🇬🇧 İngilizce</button>
        </div>
      )}

      {/* 2. SEVİYE EKRANI */}
      {screen === 'level' && (
        <div className="menu-screen">
          <h2 className="screen-title">Zorluk Seç</h2>
          <button className="btn-main btn-level" onClick={() => handleLevelSelect('a1_a2')}>⭐️ A1 & A2</button>
          <button className="btn-main btn-level" onClick={() => handleLevelSelect('b1_b2')}>🚀 B1 & B2</button>
          <button className="btn-main btn-level" onClick={() => handleLevelSelect('c1_c2')}>🔥 C1 & C2</button>
          <button className="btn-main btn-level" onClick={() => handleLevelSelect('academic')}>🎓 Akademik</button>
          <button className="btn-main btn-collection" onClick={() => { setShowCollection(true); setScreen('collection'); }}>
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
                <h3>Kelime Kartı</h3> {/* Başlığı değiştirdik */}
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
                    {!canPlayAudio && mode === 'TR_EN' ? '🔒 Önce Çöz' : '🔊 Telaffuzu Dinle'}
                  </button>
                )}

                {/* 4. KISIM: İPUCU BUTONU (Daha minimal) */}
                <button className="btn-hint-text" onClick={giveHint} disabled={!selectedWord}>
                  💡 Harf İpucu Al ({hintsUsed})
                </button>

              </div>
            </div>

            {/* Klavye (Her yerde görünür) */}
            <div className="keyboard-container">
              {keyboardRows.map((row, i) => (
                <div key={i} className="kb-row">
                  {row.map(k => (
                    <button
                      key={k}
                      className="kb-key notranslate" /* Çeviriyi engellemek için kritik */
                      onClick={(e) => {
                        e.preventDefault(); // Varsayılan davranışı durdur
                        e.currentTarget.blur(); // Odaklanmayı kaldır (klavye açılmasın diye)
                        handleKeyInput(k);
                      }}
                      /* Tarayıcı müdahalelerini kapatan özellikler */
                      translate="no"
                      spellCheck="false"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                    >
                      {k}
                    </button>
                  ))}
                  {i === 2 && (
                    <button className="kb-key wide" onClick={(e) => { e.currentTarget.blur(); handleKeyInput('BACKSPACE'); }}>
                      ⌫
                    </button>
                  )}
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* KAZANMA MODALI */}
      {showWinModal && (
        <div className="modal">
          <div className="modal-box">
            <h2 style={{ color: 'var(--correct)', marginBottom: '5px' }}>Tebrikler! 🎉</h2>

            {/* Yüzdelik Skor */}
            <div style={{ fontSize: '3rem', fontWeight: '800', color: '#2d3436', lineHeight: '1' }}>
              %{Math.round((Math.max(0, totalLetters - hintsUsed) / totalLetters) * 100)}
            </div>
            <p style={{ color: '#636e72', fontWeight: '600', fontSize: '0.9rem', marginBottom: '5px' }}>
              Başarı Skoru
            </p>

            {/* İstenen 1. Özellik: Harf Sayısı */}
            <div className="score-detail">
              {Math.max(0, totalLetters - hintsUsed)} / {totalLetters} Bilinen Harf
            </div>

            {/* İstenen 2. Özellik: Kelime Listesi */}
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

            {/* Butonlar */}
            <div className="modal-buttons">
              <button className="btn-main btn-lang" onClick={() => startGame(sourceWords)} style={{ justifyContent: 'center', width: '100%', margin: '0' }}>
                Tekrar Oyna
              </button>
              <button className="btn-back" style={{ color: '#636e72', marginTop: '10px', fontSize: '0.9rem' }} onClick={saveToCollection}
              >
                Kaydet ve Çık
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. KOLEKSİYON EKRANI (Jony Ive Style) */}
      {screen === 'collection' && (
        <div className="collection-screen">

          <div className="collection-header">
            <h2 className="coll-title">Koleksiyonum</h2>
            <button className="btn-close-coll" onClick={() => setScreen('lang')}>✕</button>
          </div>

          <div className="coll-stats">
            <div className="stat-card">
              <div className="stat-num">{collection.known.length}</div>
              <div className="stat-label">Hafızamda</div>
            </div>
            <div className="stat-card review">
              <div className="stat-num">{collection.review.length}</div>
              <div className="stat-label">Geliştirilecek</div>
            </div>
          </div>

          <div className="coll-list-container">
            {/* HİÇ KELİME YOKSA */}
            {collection.known.length + collection.review.length === 0 && (
              <div className="empty-state">
                <div style={{ fontSize: '3rem' }}>📭</div>
                <p>Henüz bir kelime biriktirmedin.<br />Oyun oynadıkça burası dolacak.</p>
              </div>
            )}

            {/* GELİŞTİRİLECEKLER LİSTESİ (Varsa) */}
            {collection.review.length > 0 && (
              <div className="list-section">
                <h3 className="section-title" style={{ color: '#ff7675' }}>Geliştirilecekler</h3>
                {collection.review.map((item, i) => (
                  <div key={i} className="word-card" onClick={() => speakText(item.en)}>
                    <div className="wc-left">
                      <span className="wc-en">{item.en}</span>
                      <span className="wc-tr">{item.tr}</span>
                    </div>
                    <button
                      className="wc-speak-btn"
                      onClick={(e) => {
                        e.stopPropagation(); // Karta tıklamayı engelle, sadece butona basılsın
                        speakText(item.en);
                      }}
                    >
                      <SpeakerIcon /> {/* SVG İkonu Çağırıyoruz */}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* HAFIZAMDAKİLER LİSTESİ */}
            {collection.known.length > 0 && (
              <div className="list-section">
                <h3 className="section-title" style={{ color: '#00b894' }}>Hafızamda</h3>
                {collection.known.map((item, i) => (
                  <div key={i} className="word-card" onClick={() => speakText(item.en)}>
                    <div className="wc-left">
                      <span className="wc-en">{item.en}</span>
                      <span className="wc-tr">{item.tr}</span>
                    </div>
                    <button
                      className="wc-speak-btn"
                      onClick={(e) => {
                        e.stopPropagation(); // Karta tıklamayı engelle, sadece butona basılsın
                        speakText(item.en);
                      }}
                    >
                      <SpeakerIcon /> {/* SVG İkonu Çağırıyoruz */}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;