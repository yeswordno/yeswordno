// src/utils/duelLogic.js
// Gerçek çengel bulmaca algoritması — gameLogic.js ile aynı mantık

const GS = 13; // Duel için 13x13 grid (klasikteki 15x15'ten biraz küçük)

// ─── GÜN NUMARASI ─────────────────────────────────────────────────────────────
export function getDayNumber() {
  const start = new Date('2025-01-01T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now - start) / 86400000);
}

function seededRng(seed) {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─── GÜNLÜK KELİME SEÇİMİ ─────────────────────────────────────────────────────
export function getDailyWords(allWords) {
  const rng = seededRng(getDayNumber() * 999983 + 7);
  const pool = allWords.filter(w => {
    const en = w.en?.toUpperCase().replace(/[^A-Z]/g, '');
    const tr = w.tr?.trim();
    return en && en.length >= 3 && en.length <= 9 && tr && tr.length >= 2;
  });
  return [...pool].sort(() => rng() - 0.5).slice(0, 35).map(w => ({
    answer: w.en.toUpperCase().replace(/[^A-Z]/g, ''),
    clue: w.tr.toLocaleUpperCase('tr-TR'),
    original: w,
  }));
}

// ─── ÇENGEL BULMACA ÜRETİCİ (gameLogic.js ile aynı algoritma) ────────────────
function canPlace(grid, word, row, col, dir) {
  if (row < 0 || col < 0) return false;
  if (dir === 'across' && col + word.length > GS) return false;
  if (dir === 'down' && row + word.length > GS) return false;

  if (dir === 'across') {
    if (col > 0 && grid[row][col - 1] !== null) return false;
    if (col + word.length < GS && grid[row][col + word.length] !== null) return false;
  } else {
    if (row > 0 && grid[row - 1][col] !== null) return false;
    if (row + word.length < GS && grid[row + word.length]?.[col] !== null) return false;
  }

  for (let i = 0; i < word.length; i++) {
    const r = dir === 'across' ? row : row + i;
    const c = dir === 'across' ? col + i : col;
    if (r >= GS || c >= GS) return false;
    const cur = grid[r][c];
    if (cur !== null) {
      if (cur !== word[i]) return false;
    } else {
      if (dir === 'across') {
        if (r > 0 && grid[r - 1][c] !== null) return false;
        if (r < GS - 1 && grid[r + 1][c] !== null) return false;
      } else {
        if (c > 0 && grid[r][c - 1] !== null) return false;
        if (c < GS - 1 && grid[r][c + 1] !== null) return false;
      }
    }
  }
  return true;
}

function placeWord(grid, answer, row, col, dir) {
  for (let i = 0; i < answer.length; i++) {
    const r = dir === 'across' ? row : row + i;
    const c = dir === 'across' ? col + i : col;
    grid[r][c] = answer[i];
  }
}

export function buildDuelBoard(words) {
  const sorted = [...words].sort((a, b) => b.answer.length - a.answer.length);
  const grid = Array.from({ length: GS }, () => Array(GS).fill(null));
  const placed = [];

  if (!sorted.length) return { grid, placedWords: [], GRID_SIZE: GS };

  // İlk kelimeyi ortaya yerleştir
  const first = sorted[0];
  const r0 = Math.floor(GS / 2);
  const c0 = Math.floor((GS - first.answer.length) / 2);
  placeWord(grid, first.answer, r0, c0, 'across');
  placed.push({ ...first, row: r0, col: c0, dir: 'across', index: 0 });

  for (let i = 1; i < sorted.length; i++) {
    const word = sorted[i];
    let didPlace = false;

    for (const pw of placed) {
      if (didPlace) break;
      for (let j = 0; j < pw.answer.length; j++) {
        if (didPlace) break;
        for (let k = 0; k < word.answer.length; k++) {
          if (word.answer[k] !== pw.answer[j]) continue;
          const newDir = pw.dir === 'across' ? 'down' : 'across';
          let nr, nc;
          if (newDir === 'down') {
            nr = pw.row + (pw.dir === 'across' ? 0 : j) - k;
            nc = pw.col + (pw.dir === 'across' ? j : 0);
          } else {
            nr = pw.row + (pw.dir === 'across' ? 0 : j);
            nc = pw.col + (pw.dir === 'across' ? j : 0) - k;
          }
          if (canPlace(grid, word.answer, nr, nc, newDir)) {
            placeWord(grid, word.answer, nr, nc, newDir);
            placed.push({ ...word, row: nr, col: nc, dir: newDir, index: placed.length });
            didPlace = true;
            break;
          }
        }
      }
    }
  }

  // Bulmaca numaralandırması (sol→sağ, üst→alt)
  const startCells = {};
  placed.forEach(w => {
    const k = `${w.row}-${w.col}`;
    if (!startCells[k]) startCells[k] = [];
    startCells[k].push(w);
  });
  let num = 1;
  const nums = {};
  Object.keys(startCells)
    .sort((a, b) => {
      const [ar, ac] = a.split('-').map(Number);
      const [br, bc] = b.split('-').map(Number);
      return ar !== br ? ar - br : ac - bc;
    })
    .forEach(k => { nums[k] = num++; });

  const numberedWords = placed.map(w => ({
    ...w,
    number: nums[`${w.row}-${w.col}`],
  }));

  return { grid, placedWords: numberedWords, GRID_SIZE: GS };
}

// ─── ELİNDEKİ HARFLER ─────────────────────────────────────────────────────────
export function dealHand(solution, userGrid, count = 5) {
  const empty = [];
  for (let r = 0; r < GS; r++) {
    for (let c = 0; c < GS; c++) {
      if (solution[r][c] !== null && (userGrid[r][c] === '' || userGrid[r][c] === undefined)) {
        empty.push({ r, c, letter: solution[r][c] });
      }
    }
  }
  for (let i = empty.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [empty[i], empty[j]] = [empty[j], empty[i]];
  }
  return empty.slice(0, Math.min(count, empty.length)).map((item, i) => ({
    id: `${Date.now()}_${i}_${item.r}_${item.c}`,
    ...item,
  }));
}

// ─── AI HAMLESİ (Dengeli — 3-4 harf, %60 doğruluk) ───────────────────────────
export function aiMakeMove(solution, userGrid) {
  const ACCURACY = 0.60;
  const COUNT_MIN = 2;
  const COUNT_MAX = 4;
  const count = COUNT_MIN + Math.floor(Math.random() * (COUNT_MAX - COUNT_MIN + 1));

  const empty = [];
  for (let r = 0; r < GS; r++) {
    for (let c = 0; c < GS; c++) {
      if (solution[r][c] !== null && (userGrid[r][c] === '' || userGrid[r][c] === undefined)) {
        empty.push({ r, c, letter: solution[r][c] });
      }
    }
  }
  for (let i = empty.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [empty[i], empty[j]] = [empty[j], empty[i]];
  }

  return empty.slice(0, Math.min(count, empty.length)).map(({ r, c, letter }) => {
    if (Math.random() < ACCURACY) return { r, c, letter };
    const wrong = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.replace(letter, '');
    return { r, c, letter: wrong[Math.floor(Math.random() * wrong.length)] };
  });
}

// ─── PUAN HESAPLAMA ───────────────────────────────────────────────────────────
// Bir hamle için puan: doğru +1, yanlış -1
export function scoreMove(r, c, letter, solution) {
  if (solution[r]?.[c] === null) return 0;
  return solution[r][c] === letter ? 1 : -1;
}

// Tamamlanan kelimeler için bonus: her kelime = o kelimenin harf sayısı kadar puan
export function calcWordBonuses(newGrid, solution, placedWords, alreadyCompleted) {
  let bonus = 0;
  const nowCompleted = new Set(alreadyCompleted);

  placedWords.forEach(w => {
    const key = `w-${w.index}`;
    if (nowCompleted.has(key)) return;

    let done = true;
    for (let i = 0; i < w.answer.length; i++) {
      const r = w.dir === 'across' ? w.row : w.row + i;
      const c = w.dir === 'across' ? w.col + i : w.col;
      if (newGrid[r]?.[c] !== solution[r]?.[c]) { done = false; break; }
    }
    if (done) {
      nowCompleted.add(key);
      bonus += w.answer.length;
    }
  });

  return { bonus, nowCompleted };
}

// ─── STREAK & KAYIT ───────────────────────────────────────────────────────────
export function getStreak() {
  try { return JSON.parse(localStorage.getItem('duel_streak') || '{"count":0,"lastDay":-1}'); }
  catch { return { count: 0, lastDay: -1 }; }
}
export function updateStreak() {
  const day = getDayNumber();
  const s = getStreak();
  if (s.lastDay === day) return s;
  const n = { count: s.lastDay === day - 1 ? s.count + 1 : 1, lastDay: day };
  localStorage.setItem('duel_streak', JSON.stringify(n));
  return n;
}
export function getTodayResult() {
  try { return JSON.parse(localStorage.getItem(`duel_${getDayNumber()}`)); }
  catch { return null; }
}
export function saveTodayResult(p, a) {
  updateStreak();
  localStorage.setItem(`duel_${getDayNumber()}`, JSON.stringify({ p, a }));
}
export function buildShareText(day, p, a) {
  const won = p >= a;
  return `🗡️ Kelime Düellosu #${day}\n${won ? '🏆' : '😤'} Ben: ${p} puan\n🤖 Rakip: ${a} puan\n\nwordtr.vercel.app`;
}