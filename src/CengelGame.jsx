import React, { useState, useEffect, useRef } from 'react';
import './CengelGame.css';

// Sürükleme görselinin parmağa göre ofseti (sağ-üst çapraz).
// Aynı değerler hem görseli konumlamak hem bırakma isabetini hizalamak için kullanılır.
const DRAG_OFFSET_X = 14;
const DRAG_OFFSET_Y = -46;

// Günlük ilerlemeyi tarayıcıda saklamak için anahtar öneki
const STORAGE_PREFIX = 'cengel_save_';

const CengelGame = ({ onBack, level = 'medium' } = {}) => {
  const [puzzle, setPuzzle] = useState(null);
  const [gridState, setGridState] = useState({});
  const [lockedCells, setLockedCells] = useState([]);
  const [opponentLockedCells, setOpponentLockedCells] = useState([]);
  const [busy, setBusy] = useState(false);
  const [turnMsg, setTurnMsg] = useState('');
  const [rack, setRack] = useState([]);
  const [pool, setPool] = useState([]);
  const [score, setScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [completedWords, setCompletedWords] = useState([]);
  const [animations, setAnimations] = useState({});
  // Tamamlanan kelime için geçici bonus animasyonu: [{id, wordId}]
  const [wordBonuses, setWordBonuses] = useState([]);
  // Hücreden skor tablosuna uçan puanlar: [{id, text, x0, y0, dx, dy}]
  const [flyingPoints, setFlyingPoints] = useState([]);
  // Yanlış harfin rafa geri uçan taşı: [{id, letter, x0, y0, dx, dy}]
  const [flyingTiles, setFlyingTiles] = useState([]);
  // Rakibin skor tablosundan hücreye uçan taşı: [{id, letter, x0, y0, dx, dy}]
  const [flyingOppTiles, setFlyingOppTiles] = useState([]);
  // Sürüklenen taşın parmağı takip eden görseli: {letter, x, y}
  const [dragView, setDragView] = useState(null);
  const [error, setError] = useState(false);
  // Mobil tap-to-select için seçili raf taşı
  const [selectedRackItem, setSelectedRackItem] = useState(null);
  // Geri Al geçmişi: [{cellId, rackItem, displaced}]
  const [moveHistory, setMoveHistory] = useState([]);
  // Dokunulunca büyüyen soru hücresi
  const [activeClue, setActiveClue] = useState(null);
  // Oyun bitti mi (tüm hücreler dolu) — bitince tekrar oynanamaz
  const [gameOver, setGameOver] = useState(false);
  // localStorage'a kayıt yapılabilsin mi (ilk yükleme bitmeden yazma)
  const restoredRef = useRef(false);

  // Rakip hamlesi setTimeout ile gecikmeli çalıştığı için kapanışta (closure)
  // bayatlamış state okumasın diye güncel değerleri ref'te tutuyoruz.
  const poolRef = useRef([]);
  const gridStateRef = useRef({});
  const oppLockedRef = useRef([]);
  useEffect(() => { poolRef.current = pool; }, [pool]);
  useEffect(() => { gridStateRef.current = gridState; }, [gridState]);
  useEffect(() => { oppLockedRef.current = opponentLockedCells; }, [opponentLockedCells]);

  // Bu seviyenin kayıt anahtarı: cengel_save_<seviye>_<tarih>
  const saveKey = (id) => `${STORAGE_PREFIX}${level}_${id}`;

  useEffect(() => {
    fetch(`/puzzles/daily-${level}.json`)
      .then(response => {
        if (!response.ok) throw new Error("JSON bulunamadı");
        return response.json();
      })
      .then(raw => {
        // Yeni format: { puzzles: [ {id,...}, ... ] } — İstanbul tarihine göre bugünü seç.
        // Eski format: tek bulmaca objesi — olduğu gibi kullan (geri uyum).
        let data = raw;
        if (raw && Array.isArray(raw.puzzles)) {
          const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
          data = raw.puzzles.find(p => p.id === today)
            || raw.puzzles.filter(p => p.id <= today).sort((a, b) => (a.id < b.id ? -1 : 1)).pop()
            || raw.puzzles[raw.puzzles.length - 1];
        }
        if (!data) throw new Error("Kuyrukta bulmaca yok");
        setPuzzle(data);
        // Bugünün ilerlemesi kayıtlıysa geri yükle (kapatıp gelince devam)
        let saved = null;
        try { saved = JSON.parse(localStorage.getItem(saveKey(data.id))); } catch { saved = null; }
        if (saved) {
          setGridState(saved.gridState || {});
          setLockedCells(saved.lockedCells || []);
          setOpponentLockedCells(saved.opponentLockedCells || []);
          setScore(saved.score || 0);
          setOpponentScore(saved.opponentScore || 0);
          setCompletedWords(saved.completedWords || []);
          setRack(saved.rack || []);
          setPool(saved.pool || []);
          setGameOver(!!saved.gameOver);
        } else {
          const initialPool = [...data.letterPool];
          const initialRack = initialPool.splice(0, 5).map((letter, idx) => ({ id: `r-${idx}`, letter }));
          setRack(initialRack);
          setPool(initialPool);
        }
        restoredRef.current = true;
      })
      .catch(err => {
        console.error("Bulmaca yüklenirken hata:", err);
        setError(true);
      });
  }, []);

  // İlerlemeyi sürekli kaydet (taşlar, skorlar, kilitler yerinde kalsın)
  useEffect(() => {
    if (!puzzle || !restoredRef.current) return;
    try {
      localStorage.setItem(saveKey(puzzle.id), JSON.stringify({
        gridState, lockedCells, opponentLockedCells, score, opponentScore,
        completedWords, rack, pool, gameOver,
      }));
    } catch { /* kota dolu vb. — sessiz geç */ }
  }, [puzzle, gridState, lockedCells, opponentLockedCells, score, opponentScore, completedWords, rack, pool, gameOver]);

  // Tüm harf hücreleri dolunca oyunu bitir (skor uçuşları insin diye kısa gecikme)
  useEffect(() => {
    if (!puzzle || gameOver) return;
    const total = puzzle.cells.filter(c => c.type === 'letter').length;
    const lockedTotal = new Set([...lockedCells, ...opponentLockedCells]).size;
    if (total > 0 && lockedTotal >= total) {
      const t = setTimeout(() => setGameOver(true), 1900);
      return () => clearTimeout(t);
    }
  }, [puzzle, lockedCells, opponentLockedCells, gameOver]);

  // Harf yerleştirme (hem drag-drop hem tap için ortak)
  const placeItem = (rackItem, cellId) => {
    const displaced = gridState[cellId] || null;
    setMoveHistory(prev => [...prev, { cellId, rackItem, displaced }]);
    setGridState(prev => ({ ...prev, [cellId]: rackItem }));
    setRack(prev => {
      let updated = prev.filter(i => i.id !== rackItem.id);
      if (displaced) updated = [...updated, displaced];
      return updated;
    });
    setSelectedRackItem(null);
  };

  // Hücredeki harfi rafa iade et (tıklama ile)
  const returnToRack = (cellId) => {
    const item = gridState[cellId];
    if (!item) return;
    setRack(prev => [...prev, item]);
    setGridState(prev => { const s = { ...prev }; delete s[cellId]; return s; });
    // Bu hücreye ait geçmiş kayıtlarını temizle (çift iade olmasın)
    setMoveHistory(prev => prev.filter(m => m.cellId !== cellId));
  };

  // Geri Al: son yerleştirmeyi geri döndür
  const undoLastMove = () => {
    if (moveHistory.length === 0) return;
    const { cellId, rackItem, displaced } = moveHistory[moveHistory.length - 1];

    // Eğer hücredeki taş değiştiyse (manuel iade edilmişse) sadece kaydı sil
    if (!gridState[cellId] || gridState[cellId].id !== rackItem.id) {
      setMoveHistory(prev => prev.slice(0, -1));
      return;
    }

    setMoveHistory(prev => prev.slice(0, -1));
    setGridState(prev => {
      const s = { ...prev };
      if (displaced) s[cellId] = displaced;
      else delete s[cellId];
      return s;
    });
    setRack(prev => {
      let updated = [...prev, rackItem];
      if (displaced) updated = updated.filter(i => i.id !== displaced.id);
      return updated;
    });
  };

  // Yerleştirilmiş bir taşı başka bir hücreye taşı
  const moveItem = (fromCellId, toCellId) => {
    if (fromCellId === toCellId) return;
    if (lockedCells.includes(toCellId) || lockedCells.includes(fromCellId)) return;
    const item = gridState[fromCellId];
    if (!item) return;
    const displaced = gridState[toCellId] || null;
    setGridState(prev => {
      const s = { ...prev };
      delete s[fromCellId];
      s[toCellId] = item;
      return s;
    });
    if (displaced) setRack(prev => [...prev, displaced]);
    setMoveHistory(prev => {
      const h = prev.filter(m => m.cellId !== fromCellId);
      return [...h, { cellId: toCellId, rackItem: item, displaced }];
    });
    setSelectedRackItem(null);
  };

  // Hücre kilitli mi (oyuncu veya rakip tarafından)
  const isLockedCell = (id) =>
    lockedCells.includes(id) || opponentLockedCells.includes(id);

  // --- Pointer tabanlı sürükle-bırak (mobil + masaüstü) ---
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);

  // Skor tablosundaki sayıların referansları (uçan puan hedefi)
  const scoreRef = useRef(null);
  const oppScoreRef = useRef(null);

  // (x0,y0) → (x1,y1) arası uçan bir puan üret (value: skora eklenecek; who: hedef taraf)
  const spawnFly = (x0, y0, x1, y1, text, value, who) => {
    const id = `fly-${Date.now()}-${Math.random()}`;
    setFlyingPoints(prev => [...prev, { id, text, x0, y0, dx: x1 - x0, dy: y1 - y0, value, who }]);
    // Güvenlik ağı: onfinish bir şekilde tetiklenmezse yine de temizle
    setTimeout(() => setFlyingPoints(prev => prev.filter(p => p.id !== id)), 2600);
  };

  // Verilen koordinattan skor tablosuna puan uçur
  const flyFrom = (x0, y0, text, who, value) => {
    const targetEl = who === 'rival' ? oppScoreRef.current : scoreRef.current;
    if (!targetEl) return;
    const t = targetEl.getBoundingClientRect();
    spawnFly(x0, y0, t.left + t.width / 2, t.top + t.height / 2, text, value, who);
  };

  // Bir hücreden skor tablosuna puan uçur (gecikmeli olabilir)
  const flyFromCell = (cellId, text, who, delayMs = 0, value = 0) => {
    setTimeout(() => {
      const el = document.querySelector(`[data-cell-id="${cellId}"]`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      // Hücrenin sağ üst köşesi (harfin üstünü kapatmasın)
      flyFrom(r.right - 7, r.top + 9, text, who, value);
    }, delayMs);
  };

  // Yanlış harf: taşın kendisi (koyu harf) hücreden rafa uçar
  const flyTileToRack = (cellId, letter, delayMs = 0) => {
    setTimeout(() => {
      const el = document.querySelector(`[data-cell-id="${cellId}"]`);
      const rackEl = document.querySelector('[data-rack]');
      if (!el || !rackEl) return;
      const r = el.getBoundingClientRect();
      const t = rackEl.getBoundingClientRect();
      const x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
      const x1 = t.left + t.width / 2, y1 = t.top + t.height / 2;
      const id = `tile-${Date.now()}-${Math.random()}`;
      setFlyingTiles(prev => [...prev, { id, letter, x0, y0, dx: x1 - x0, dy: y1 - y0 }]);
      setTimeout(() => setFlyingTiles(prev => prev.filter(p => p.id !== id)), 950);
    }, delayMs);
  };

  // Rakip taşı: rakip skor tablosundan hedef hücreye uçar (oraya "yerleşir")
  const flyOppTileToCell = (cellId, letter, delayMs = 0) => {
    setTimeout(() => {
      const el = document.querySelector(`[data-cell-id="${cellId}"]`);
      const scoreEl = oppScoreRef.current;
      if (!el || !scoreEl) return;
      const r = el.getBoundingClientRect();
      const s = scoreEl.getBoundingClientRect();
      const x0 = s.left + s.width / 2, y0 = s.top + s.height / 2;
      const x1 = r.left + r.width / 2, y1 = r.top + r.height / 2;
      const id = `otile-${Date.now()}-${Math.random()}`;
      setFlyingOppTiles(prev => [...prev, { id, letter, x0, y0, dx: x1 - x0, dy: y1 - y0 }]);
      setTimeout(() => setFlyingOppTiles(prev => prev.filter(p => p.id !== id)), 1200);
    }, delayMs);
  };

  // Tamamlanan kelimenin +N puanını, kelime kutusunun sağ üst köşesinden skora uçur
  const flyFromWord = (cellIds, text, who, value) => {
    const rects = cellIds
      .map(id => document.querySelector(`[data-cell-id="${id}"]`))
      .filter(Boolean)
      .map(el => el.getBoundingClientRect());
    if (rects.length === 0) return;
    const maxRight = Math.max(...rects.map(r => r.right));
    const minTop = Math.min(...rects.map(r => r.top));
    flyFrom(maxRight - 7, minTop + 9, text, who, value);
  };

  // Uçan puan skora vardığında: toplamı uygula + şık bir "pop" efekti
  const landScore = (who, value) => {
    const ref = who === 'rival' ? oppScoreRef : scoreRef;
    if (who === 'rival') setOpponentScore(p => Math.max(0, p + value));
    else setScore(p => Math.max(0, p + value));
    if (ref.current) {
      ref.current.animate(
        [
          { transform: 'scale(1)' },
          { transform: 'scale(1.5)' },
          { transform: 'scale(1)' },
        ],
        { duration: 380, easing: 'cubic-bezier(.34,1.56,.64,1)' }
      );
    }
  };

  // Yeni eklenen uçan puanları Web Animations API ile hedefe taşı
  useEffect(() => {
    flyingPoints.forEach(fp => {
      const el = document.querySelector(`[data-fly-id="${fp.id}"]`);
      if (el && !el.dataset.animated) {
        el.dataset.animated = '1';
        const anim = el.animate([
          // Önce hücrede minik bir + / − belirir ve bir süre durur (okunsun)…
          { transform: 'translate(-50%, -50%) scale(0.5)', opacity: 0, offset: 0 },
          { transform: 'translate(-50%, -50%) scale(1.05)', opacity: 1, offset: 0.12 },
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.18 },
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.62 },
          // …sonra hedefe doğru süzülür
          { transform: `translate(calc(-50% + ${fp.dx}px), calc(-50% + ${fp.dy}px)) scale(0.5)`, opacity: 0, offset: 1 },
        ], { duration: 1700, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
        // Puan skor tablosuna varınca: toplamı işle + puanı kaldır (anında değil, uçuş bitince)
        anim.onfinish = () => {
          if (fp.value) landScore(fp.who, fp.value);
          setFlyingPoints(prev => prev.filter(p => p.id !== fp.id));
        };
      }
    });
  }, [flyingPoints]);

  // Yanlış harf taşının rafa uçuşu
  useEffect(() => {
    flyingTiles.forEach(ft => {
      const el = document.querySelector(`[data-tile-id="${ft.id}"]`);
      if (el && !el.dataset.animated) {
        el.dataset.animated = '1';
        el.animate([
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0 },
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.12 },
          { transform: `translate(calc(-50% + ${ft.dx}px), calc(-50% + ${ft.dy}px)) scale(0.85)`, opacity: 0.15, offset: 1 },
        ], { duration: 850, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' });
      }
    });
  }, [flyingTiles]);

  // Rakip taşının skordan hücreye yavaşça uçuşu (yerleşme hissi)
  useEffect(() => {
    flyingOppTiles.forEach(ft => {
      const el = document.querySelector(`[data-otile-id="${ft.id}"]`);
      if (el && !el.dataset.animated) {
        el.dataset.animated = '1';
        el.animate([
          { transform: 'translate(-50%, -50%) scale(0.55)', opacity: 0, offset: 0 },
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.18 },
          { transform: `translate(calc(-50% + ${ft.dx}px), calc(-50% + ${ft.dy}px)) scale(1)`, opacity: 1, offset: 0.9 },
          { transform: `translate(calc(-50% + ${ft.dx}px), calc(-50% + ${ft.dy}px)) scale(0.95)`, opacity: 0.85, offset: 1 },
        ], { duration: 880, easing: 'cubic-bezier(.35,0,.25,1)', fill: 'forwards' });
      }
    });
  }, [flyingOppTiles]);

  const beginDrag = (e, item, from, cellId) => {
    if (busy || gameOver) return;
    setActiveClue(null);
    if (e.button != null && e.button !== 0) return;
    const startX = e.clientX, startY = e.clientY;
    dragRef.current = { item, from, cellId, startX, startY, moved: false };

    const onMove = (ev) => {
      const d = dragRef.current;
      if (!d || !d.item) return;
      const dx = ev.clientX - d.startX, dy = ev.clientY - d.startY;
      if (!d.moved && Math.hypot(dx, dy) > 8) {
        d.moved = true;
        setSelectedRackItem(null);
      }
      if (d.moved) {
        if (ev.cancelable) ev.preventDefault();
        setDragView({ letter: d.item.letter, x: ev.clientX, y: ev.clientY });
      }
    };
    const onUp = (ev) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const d = dragRef.current;
      dragRef.current = null;
      setDragView(null);
      if (!d || !d.moved) return; // hareket yoksa: normal tıklama (tap) devreye girsin
      // Sürükleme sonrası oluşacak click olayını bastır
      suppressClickRef.current = true;
      setTimeout(() => { suppressClickRef.current = false; }, 350);

      // İsabet noktası, görseldeki taşın merkeziyle aynı olsun (parmağın değil)
      const el = document.elementFromPoint(ev.clientX + DRAG_OFFSET_X, ev.clientY + DRAG_OFFSET_Y);
      const cellEl = el && el.closest('[data-cell-id]');
      const rackEl = el && el.closest('[data-rack]');
      if (cellEl) {
        const targetId = cellEl.getAttribute('data-cell-id');
        if (!isLockedCell(targetId)) {
          if (d.from === 'rack') placeItem(d.item, targetId);
          else if (d.from === 'cell') moveItem(d.cellId, targetId);
        }
      } else if (rackEl && d.from === 'cell') {
        returnToRack(d.cellId);
      }
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
  };

  // --- Tap / Click (sürükleme dışı) ---
  const handleRackTileClick = (item) => {
    if (suppressClickRef.current) return;
    setActiveClue(null);
    // Aynı taşa tekrar basılırsa seçimi kaldır
    setSelectedRackItem(prev => prev?.id === item.id ? null : item);
  };

  // Soru hücresine dokununca büyüt / tekrar dokununca eski haline al
  const handleClueClick = (e, cellId) => {
    e.stopPropagation();
    if (suppressClickRef.current) return;
    setActiveClue(prev => (prev === cellId ? null : cellId));
  };

  const handleCellClick = (cellId) => {
    if (suppressClickRef.current) return;
    if (gameOver || busy || isLockedCell(cellId)) return;
    if (selectedRackItem) {
      placeItem(selectedRackItem, cellId);
    } else if (gridState[cellId]) {
      returnToRack(cellId);
    }
  };

  const shuffleRack = () => {
    setRack(prev => [...prev].sort(() => Math.random() - 0.5));
    setSelectedRackItem(null);
  };

  const triggerAnimation = (cellId, type) => {
    setAnimations(prev => ({ ...prev, [cellId]: type }));
    setTimeout(() => setAnimations(prev => ({ ...prev, [cellId]: null })), 1600);
  };

  // Tamamlanan kelime: kutuyu göster, +N puanını skor tablosuna uçur (color: 'mor'|'amber')
  const showWordBonus = (wid, idx, color) => {
    const who = color === 'amber' ? 'rival' : 'you';
    setTimeout(() => {
      const bonusId = `${wid}-${Date.now()}-${idx}`;
      setWordBonuses(prev => [...prev, { id: bonusId, wordId: wid, color }]);
      setTimeout(() => {
        setWordBonuses(prev => prev.filter(b => b.id !== bonusId));
      }, 1300);
      // Kelime puanı kutunun sağ üstünden skor tablosuna uçar (varınca işlenir)
      const w = puzzle.words[wid];
      if (w) flyFromWord(w.cells, `+${w.length}`, who, w.length);
    }, 1000 + idx * 300);
  };

  const submitTurn = () => {
    if (busy || gameOver) return;
    setBusy(true);

    let delta = 0;
    let newLocked = [...lockedCells];
    const wrongEntries = [];

    puzzle.cells.filter(c => c.type === "letter" && !lockedCells.includes(c.id)).forEach(cell => {
      const placed = gridState[cell.id];
      if (placed) {
        if (placed.letter === cell.expected) {
          delta++;
          newLocked.push(cell.id);
          triggerAnimation(cell.id, 'anim-plus1');
          flyFromCell(cell.id, '+1', 'you', 0, 1);
        } else {
          // Yanlış: önce köşede −1 belirip durur (+1 gibi), harf birazdan uçar
          delta--;
          wrongEntries.push({ id: cell.id, placed });
          flyFromCell(cell.id, '−1', 'you', 0, -1);
        }
      }
    });

    // Kelime tamamlanma kontrolü (oyuncu + rakip kilitleri birlikte)
    let newCompleted = [...completedWords];
    const allLocked = new Set([...newLocked, ...opponentLockedCells]);
    const justCompleted = [];
    Object.keys(puzzle.words).forEach(wordId => {
      if (!newCompleted.includes(wordId)) {
        if (puzzle.words[wordId].cells.every(cId => allLocked.has(cId))) {
          delta += puzzle.words[wordId].length;
          newCompleted.push(wordId);
          justCompleted.push(wordId);
        }
      }
    });
    justCompleted.forEach((wid, idx) => showWordBonus(wid, idx, 'mor'));

    // Skor anında işlenmez; her uçan +/− puan skora vardıkça (landScore) işlenir.
    setLockedCells(newLocked);
    setCompletedWords(newCompleted);
    setMoveHistory([]);
    setSelectedRackItem(null);

    // Raf, taşların uçuşu rafa varınca dolar (doğrular zaten kilitli kaldı).
    const finalizeRack = () => {
      // Kalan boş hücre sayısı: her hücre ya kilitli ya boş (bekleyen kalmadı)
      const totalLetters = puzzle.cells.filter(c => c.type === 'letter').length;
      const emptyAfter = totalLetters - newLocked.length - opponentLockedCells.length;
      const cap = Math.min(5, Math.max(0, emptyAfter));
      let nextRack = [...rack, ...wrongEntries.map(w => w.placed)];
      let nextPool = [...pool];
      // Boş hücre kadar taş ver (5'i geçme)
      while (nextRack.length < cap && nextPool.length > 0) {
        const l = nextPool.shift();
        nextRack.push({ id: `p-${Date.now()}-${Math.random()}`, letter: l });
      }
      // Boş hücreden fazla taş varsa fazlasını havuza geri koy
      while (nextRack.length > cap && nextRack.length > 0) {
        nextPool.push(nextRack.pop().letter);
      }
      setRack(nextRack);
      setPool(nextPool);
    };

    if (wrongEntries.length) {
      // −1 önce belirip kısa süre durur (+1 gibi), SONRA harf ızgaradan kalkıp rafa uçar
      const FLY_DELAY = 1000;
      setTimeout(() => {
        setGridState(prev => {
          const s = { ...prev };
          wrongEntries.forEach(w => delete s[w.id]);
          return s;
        });
        wrongEntries.forEach(w => flyTileToRack(w.id, w.placed.letter, 0));
      }, FLY_DELAY);
      setTimeout(finalizeRack, FLY_DELAY + 900);
    } else {
      finalizeRack();
    }

    // Sıra rakibe geçer (oyuncu animasyonları tamamen bitsin, sonra kısa nefes)
    setTimeout(() => runOpponentTurn(newLocked, newCompleted), 3500);
  };

  // Rakip: orta seviye — her el 1–3 doğru harf koyar
  const runOpponentTurn = (playerLocked, completedSoFar) => {
    // Güncel state'i ref'ten oku (setTimeout closure'ı bayatlamasın)
    const curPool = poolRef.current;
    const curGrid = gridStateRef.current;
    const curOppLocked = oppLockedRef.current;

    const available = puzzle.cells.filter(c =>
      c.type === "letter" &&
      !playerLocked.includes(c.id) &&
      !curOppLocked.includes(c.id) &&
      !curGrid[c.id]
    );

    if (available.length === 0) {
      setBusy(false);
      return;
    }

    // RAKİBİN TAŞLARI = HAVUZDAKİ HARFLER (oyuncunun elindekiler hariç).
    // Yalnızca harfi havuzda mevcut olan hücreleri doldur → oyuncunun eli
    // asla "alakasız taş"a dönüşmez ve oyuncu+rakip = boş hücre tutarlı kalır.
    const poolCounts = {};
    curPool.forEach(l => { poolCounts[l] = (poolCounts[l] || 0) + 1; });

    // Orta seviye dağılım: 1:%50, 2:%35, 3:%15
    const r = Math.random();
    let count = r < 0.50 ? 1 : r < 0.85 ? 2 : 3;
    count = Math.min(count, available.length);

    // Karıştır, sonra harfi havuzda kalan hücreleri sırayla seç
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const picked = [];
    const remainCounts = { ...poolCounts };
    for (const c of shuffled) {
      if (picked.length >= count) break;
      if (remainCounts[c.expected] > 0) {
        remainCounts[c.expected]--;
        picked.push(c);
      }
    }

    // Rakibin oynanabilir taşı yok (kalan harflerin hepsi oyuncuda) → pas
    if (picked.length === 0) {
      setBusy(false);
      return;
    }

    // 1) Taşları rakip skorundan hücrelere uçur (yavaşça yerleşme hissi)
    const STAGGER = 280;   // taşlar arası gecikme
    const FLY = 880;       // tek uçuş süresi
    picked.forEach((c, idx) => flyOppTileToCell(c.id, c.expected, idx * STAGGER));

    // 2) Uçuşlar inince: hücreleri kilitle, +1 skora uçur, havuzdan düş, kelime kontrolü
    const landDelay = (picked.length - 1) * STAGGER + FLY;
    setTimeout(() => {
      const newOppLocked = [...curOppLocked, ...picked.map(c => c.id)];
      picked.forEach((c) => {
        triggerAnimation(c.id, 'anim-opp');
        flyFromCell(c.id, '+1', 'rival', 0, 1);
      });

      // Doldurulan hücrelerin harflerini havuzdan düş (artık güvenli: hepsi havuzdaydı)
      setPool(prev => {
        const np = [...prev];
        picked.forEach(c => {
          const i = np.indexOf(c.expected);
          if (i !== -1) np.splice(i, 1);
        });
        return np;
      });

      // Rakibin tamamladığı kelimeler
      const allLocked = new Set([...playerLocked, ...newOppLocked]);
      const newCompleted = [...completedSoFar];
      const oppCompleted = [];
      Object.keys(puzzle.words).forEach(wid => {
        if (!newCompleted.includes(wid)) {
          if (puzzle.words[wid].cells.every(cId => allLocked.has(cId))) {
            newCompleted.push(wid);
            oppCompleted.push(wid);
          }
        }
      });
      oppCompleted.forEach((wid, idx) => showWordBonus(wid, idx, 'amber'));

      setOpponentLockedCells(newOppLocked);
      // Rakip skoru anında değil, uçan +1'ler skora vardıkça (landScore) işlenir.
      setCompletedWords(newCompleted);
      setBusy(false);
    }, landDelay);
  };

  if (error) return (
    <div style={{ padding: "20px", color: "red" }}>
      <b>daily.json</b> bulunamadı! Önce <i>node generator.js</i> komutunu çalıştırarak bulmacayı üret.
    </div>
  );
  if (!puzzle) return <div className="cengel-root"><div className="loading">Yükleniyor...</div></div>;

  return (
    <div className="cengel-root">
    <div
      className="game-container"
      // Dışarıya tıklanınca seçimi kaldır (sürükleme sonrası bastır)
      onClick={() => { if (!suppressClickRef.current) { setSelectedRackItem(null); setActiveClue(null); } }}
    >
      <header className="game-header" onClick={e => e.stopPropagation()}>
        {onBack && (
          <button className="cengel-back" onClick={onBack}>← Geri</button>
        )}
        <h1 className="logo-text">WORD <span className="logo-accent">TR</span></h1>
        <div className="versus-board">
          <div className="vs-side vs-you">
            <span className="vs-label">Sen</span>
            <span className="vs-score" ref={scoreRef}>{score}</span>
          </div>
          <span className="vs-mid">VS</span>
          <div className="vs-side vs-rival">
            <span className="vs-score" ref={oppScoreRef}>{opponentScore}</span>
            <span className="vs-label">Rakip</span>
          </div>
        </div>
      </header>

      <div
        className="puzzle-grid"
        style={{
          gridTemplateColumns: `repeat(${puzzle.grid.cols}, 1fr)`,
          gridTemplateRows: `repeat(${puzzle.grid.rows}, 1fr)`,
        }}
        onClick={e => { e.stopPropagation(); setActiveClue(null); }}
      >
        {puzzle.cells.map(cell => {
          if (cell.type === "empty") return <div key={cell.id} className="cg-cell empty" />;

          if (cell.type === "clue") {
            // Çift yönlü soru hücresi (X)
            if (cell.dir === "both") {
              return (
                <div
                  key={cell.id}
                  className={`cg-cell clue clue-both${activeClue === cell.id ? ' clue-active' : ''}`}
                  onClick={(e) => handleClueClick(e, cell.id)}
                >
                  <div className="clue-half clue-half-top">
                    <span className="clue-text">{cell.textRight}</span>
                  </div>
                  <div className="clue-divider" />
                  <div className="clue-half clue-half-bottom">
                    <span className="clue-text">{cell.textDown}</span>
                  </div>
                  {/* Oklar hücrenin doğrudan çocuğu — yarım-kutu overflow'u kırpmasın */}
                  <span className="arrow-right-both">{'▶︎'}</span>
                  <span className="arrow-down-both">{'▼︎'}</span>
                </div>
              );
            }
            // Tek yönlü soru hücresi (R veya D)
            return (
              <div
                key={cell.id}
                className={`cg-cell clue${activeClue === cell.id ? ' clue-active' : ''}`}
                onClick={(e) => handleClueClick(e, cell.id)}
              >
                <span className="clue-text">{cell.text}</span>
                {cell.dir === "right" && <span className="arrow-right">{'▶︎'}</span>}
                {cell.dir === "down" && <span className="arrow-down">{'▼︎'}</span>}
              </div>
            );
          }

          const placed = gridState[cell.id];
          const lockedByPlayer = lockedCells.includes(cell.id);
          const lockedByOpp = opponentLockedCells.includes(cell.id);
          const isLocked = lockedByPlayer || lockedByOpp;
          const animClass = animations[cell.id] || '';
          // Seçili taş varsa boş/dolu kilitli olmayan hücreleri vurgula
          const isTarget = !!selectedRackItem && !isLocked;

          return (
            <div
              key={cell.id}
              className={[
                'cg-cell', 'letter-box',
                isLocked ? 'locked' : '',
                lockedByOpp ? 'opp-locked' : '',
                animClass,
                isTarget ? 'drop-target' : ''
              ].filter(Boolean).join(' ')}
              data-cell-id={cell.id}
              onClick={() => handleCellClick(cell.id)}
              onPointerDown={
                placed && !isLocked
                  ? (e) => beginDrag(e, placed, 'cell', cell.id)
                  : undefined
              }
            >
              {lockedByOpp ? (
                <span className="letter-tile opp-tile">{cell.expected}</span>
              ) : placed ? (
                <span className="letter-tile">{placed.letter}</span>
              ) : null}
            </div>
          );
        })}

        {/* Tamamlanan kelimeleri kutu içine al + bonus rozeti (ayrı katman) */}
        <div
          className="word-overlay"
          style={{
            gridTemplateColumns: `repeat(${puzzle.grid.cols}, 1fr)`,
            gridTemplateRows: `repeat(${puzzle.grid.rows}, 1fr)`,
          }}
        >
          {wordBonuses.map(({ id, wordId, color }) => {
            const w = puzzle.words[wordId];
            if (!w) return null;
            const xs = w.cells.map(c => +c.split('-')[0]);
            const ys = w.cells.map(c => +c.split('-')[1]);
            const minX = Math.min(...xs), maxX = Math.max(...xs);
            const minY = Math.min(...ys), maxY = Math.max(...ys);
            return (
              <div
                key={id}
                className={`word-box${color === 'amber' ? ' word-box-amber' : ''}`}
                style={{
                  gridColumn: `${minX + 1} / ${maxX + 2}`,
                  gridRow: `${minY + 1} / ${maxY + 2}`,
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="bottom-panel" onClick={e => e.stopPropagation()}>
        <div className="rack" data-rack="1">
          {rack.map(item => (
            <div
              key={item.id}
              className={`rack-tile${selectedRackItem?.id === item.id ? ' selected' : ''}`}
              onPointerDown={(e) => beginDrag(e, item, 'rack', null)}
              onClick={() => handleRackTileClick(item)}
            >
              {item.letter}
            </div>
          ))}
          {rack.length === 0 && <div className="empty-rack-msg">Raf Boş</div>}
        </div>

        <div className="controls">
          <button
            className="btn undo-btn"
            onClick={undoLastMove}
            disabled={moveHistory.length === 0 || busy}
          >
            <span className="undo-icon">{'↺'}</span> GERİ
          </button>
          <button className="btn shuffle-btn" onClick={shuffleRack} disabled={busy}>DEĞİŞTİR</button>
          {(() => {
            const hasPending = Object.keys(gridState).some(id => !lockedCells.includes(id));
            return (
              <button
                className={`btn submit-btn${hasPending ? '' : ' pass-btn'}`}
                onClick={submitTurn}
                disabled={busy}
              >
                {hasPending ? 'ONAYLA' : 'PAS'}
              </button>
            );
          })()}
        </div>
      </div>

      {/* Sürüklenen taşın parmağı takip eden görseli */}
      {dragView && (
        <div
          className="drag-ghost"
          style={{
            left: dragView.x,
            top: dragView.y,
            transform: `translate(calc(-50% + ${DRAG_OFFSET_X}px), calc(-50% + ${DRAG_OFFSET_Y}px)) scale(1.05)`,
          }}
        >
          {dragView.letter}
        </div>
      )}

      {/* Yanlış harfin rafa geri uçan taşı */}
      {flyingTiles.map(ft => (
        <div
          key={ft.id}
          data-tile-id={ft.id}
          className="flying-tile"
          style={{ left: ft.x0, top: ft.y0 }}
        >
          {ft.letter}
        </div>
      ))}

      {/* Rakibin skordan hücreye uçan taşı */}
      {flyingOppTiles.map(ft => (
        <div
          key={ft.id}
          data-otile-id={ft.id}
          className="flying-tile flying-tile-opp"
          style={{ left: ft.x0, top: ft.y0 }}
        >
          {ft.letter}
        </div>
      ))}

      {/* Hücreden skor tablosuna uçan puanlar */}
      {flyingPoints.map(fp => (
        <div
          key={fp.id}
          data-fly-id={fp.id}
          className={`fly-point${fp.text.startsWith('−') ? ' fly-neg' : ''}`}
          style={{ left: fp.x0, top: fp.y0 }}
        >
          {fp.text}
        </div>
      ))}

      {/* OYUN SONU EKRANI (İngilizce, sade) */}
      {gameOver && (() => {
        const won = score > opponentScore;
        const lost = score < opponentScore;
        return (
          <div className="result-overlay">
            <div className="result-card">
              <div className="result-emoji">{won ? '🏆' : lost ? '🙃' : '🤝'}</div>
              <h2 className="result-title">
                {won ? 'You won!' : lost ? 'Not this time' : "It's a tie!"}
              </h2>
              <p className="result-sub">
                {won ? 'Beautifully played. See you tomorrow.'
                  : lost ? 'So close — come back tomorrow.'
                  : 'Evenly matched. Try again tomorrow.'}
              </p>
              <div className="result-scores">
                <div className="result-score you">
                  <span>You</span>
                  <strong>{score}</strong>
                </div>
                <div className="result-vs">–</div>
                <div className="result-score rival">
                  <span>Rival</span>
                  <strong>{opponentScore}</strong>
                </div>
              </div>
              <p className="result-note">A new puzzle arrives every day at midnight.</p>
              {onBack && (
                <button className="result-btn" onClick={onBack}>Back to menu</button>
              )}
            </div>
          </div>
        );
      })()}
    </div>
    </div>
  );
};

export default CengelGame;
