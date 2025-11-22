import { useState, useEffect } from 'react';
import './App.css';
import { generateCrossword, GRID_SIZE } from './utils/gameLogic';

// JSON Verilerini İçe Aktar (Dosya yollarının senin projene uygun olduğundan emin ol)
import a1_a2 from './data/a1_a2.json';
import b1_b2 from './data/b1_b2.json';
import c1_c2 from './data/c1_c2.json';
import academic from './data/academic.json';

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
    setSelectedWord(null);
    setCursor({ r: -1, c: -1 });

    const shuffled = [...wordsData].sort(() => 0.5 - Math.random());
    const selection = shuffled.slice(0, 40).map(item => {
      const rawAnswer = mode === 'EN_TR' ? item.tr : item.en;
      const clue = mode === 'EN_TR' ? item.en : item.tr;
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
          <button className="btn-back" onClick={() => setScreen('lang')}>⬅ Geri Dön</button>
        </div>
      )}

      {/* 3. OYUN EKRANI */}
      {screen === 'game' && (
        <div id="game-screen">

          {/* MOBİL ÜST BAR (Masaüstünde CSS ile gizlenir) */}
          <div className="mobile-top-bar">
            <button className="btn-circle btn-hint" onClick={giveHint} disabled={!selectedWord}>💡</button>
            <div className="mobile-clue-box">
              <span className="mobile-clue-text">
                {selectedWord ? selectedWord.clue : "Kelime Seç"}
              </span>
            </div>
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
                <h3>Kelime Avcısı</h3>
                <button className="btn-close-desk" onClick={() => setScreen('level')}>✕</button>
              </div>
              <div className="desk-clue-area">
                <div className="desk-icon">{selectedWord ? '💡' : '👆'}</div>
                <div className="desk-text">
                  {selectedWord ? selectedWord.clue : "BAŞLAMAK İÇİN KUTUYA TIKLA"}
                </div>
                <button className="btn-hint-pill" onClick={giveHint} disabled={!selectedWord}>
                  İpucu Kullan ({hintsUsed})
                </button>
              </div>
            </div>

            {/* Klavye (Her yerde görünür) */}
            <div className="keyboard-container">
              {keyboardRows.map((row, i) => (
                <div key={i} className="kb-row">
                  {row.map(k => (
                    <button key={k} className="kb-key" onClick={(e) => { e.currentTarget.blur(); handleKeyInput(k); }}>
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
              <button className="btn-back" style={{ color: '#636e72', marginTop: '10px', fontSize: '0.9rem' }} onClick={() => { setShowWinModal(false); setScreen('level') }}>
                Menüye Dön
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;