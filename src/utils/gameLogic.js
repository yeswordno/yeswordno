// src/utils/gameLogic.js

export const GRID_SIZE = 15;

export function generateCrossword(words) {
    // Kelimeleri uzunluğa göre sırala (En uzunu önce yerleştirmek daha kolaydır)
    const sortedWords = [...words].sort((a, b) => b.answer.length - a.answer.length);
    
    // Boş bir grid oluştur
    let grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    let placedWords = [];

    if (sortedWords.length === 0) return { grid, placedWords };

    // 1. Kelimeyi tam ortaya yerleştir
    const first = sortedWords[0];
    const startRow = Math.floor(GRID_SIZE / 2);
    const startCol = Math.floor((GRID_SIZE - first.answer.length) / 2);

    if (startCol < 0) return { grid, placedWords };

    placeWord(grid, first, startRow, startCol, 'across');
    placedWords.push({ 
        ...first, 
        row: startRow, 
        col: startCol, 
        dir: 'across', 
        index: 0 
    });

    // Diğer kelimeleri yerleştirmeye çalış
    for (let i = 1; i < sortedWords.length; i++) {
        const word = sortedWords[i];
        let placed = false;

        // Yerleşmiş kelimeleri tara, kesişim noktası ara
        for (let pw of placedWords) {
            if (placed) break;

            for (let j = 0; j < pw.answer.length; j++) {
                const letterOnGrid = pw.answer[j];

                for (let k = 0; k < word.answer.length; k++) {
                    // Harfler eşleşiyor mu?
                    if (word.answer[k] === letterOnGrid) {
                        const newDir = pw.dir === 'across' ? 'down' : 'across';
                        let newRow, newCol;

                        if (newDir === 'down') {
                            newRow = pw.row + (pw.dir === 'across' ? 0 : j) - k;
                            newCol = pw.col + (pw.dir === 'across' ? j : 0);
                        } else {
                            newRow = pw.row + (pw.dir === 'across' ? 0 : j);
                            newCol = pw.col + (pw.dir === 'across' ? j : 0) - k;
                        }

                        if (canPlace(grid, word.answer, newRow, newCol, newDir)) {
                            placeWord(grid, word, newRow, newCol, newDir);
                            placedWords.push({ 
                                ...word, 
                                row: newRow, 
                                col: newCol, 
                                dir: newDir, 
                                index: placedWords.length 
                            });
                            placed = true;
                            break;
                        }
                    }
                }
                if (placed) break;
            }
        }
    }
    return { grid, placedWords };
}

function canPlace(grid, word, row, col, dir) {
    if (row < 0 || col < 0) return false;
    if (dir === 'across' && col + word.length > GRID_SIZE) return false;
    if (dir === 'down' && row + word.length > GRID_SIZE) return false;

    // Başlangıç ve bitiş komşulukları
    if (dir === 'across') {
        if (col > 0 && grid[row][col - 1] !== null) return false;
        if (col + word.length < GRID_SIZE && grid[row][col + word.length] !== null) return false;
    } else {
        if (row > 0 && grid[row - 1][col] !== null) return false;
        if (row + word.length < GRID_SIZE && grid[row + word.length][col] !== null) return false;
    }

    for (let i = 0; i < word.length; i++) {
        const r = dir === 'across' ? row : row + i;
        const c = dir === 'across' ? col + i : col;
        const currentCell = grid[r][c];

        if (currentCell !== null) {
            if (currentCell !== word[i]) return false;
        } else {
            // Yan komşuluk kontrolü (Kesişmeyen harflerin yanları boş olmalı)
            if (dir === 'across') {
                if (r > 0 && grid[r - 1][c] !== null) return false;
                if (r < GRID_SIZE - 1 && grid[r + 1][c] !== null) return false;
            } else {
                if (c > 0 && grid[r][c - 1] !== null) return false;
                if (c < GRID_SIZE - 1 && grid[r][c + 1] !== null) return false;
            }
        }
    }
    return true;
}

function placeWord(grid, word, row, col, dir) {
    for (let i = 0; i < word.answer.length; i++) {
        const r = dir === 'across' ? row : row + i;
        const c = dir === 'across' ? col + i : col;
        grid[r][c] = word.answer[i];
    }
}