/**
 * Sudoku game state management.
 * Pure logic — no DOM access. Fully testable.
 *
 * All state-mutating functions return a result object describing
 * what happened, so the UI layer can react accordingly.
 */
import { clone, generate, decode, encode, getCandidates } from "./engine.js";

export function createGameState(difficulty = "easy") {
  return {
    puzzle: [],
    solution: [],
    board: [],
    notes: [],
    selectedCell: null,
    notesMode: false,
    mistakes: 0,
    maxMistakes: 3,
    hintsRemaining: 3,
    difficulty,
    timerSeconds: 0,
    history: [],
    gameOver: false,
  };
}

export function newGame(state) {
  const result = generate(state.difficulty);
  state.puzzle = result.puzzle;
  state.solution = result.solution;
  state.board = clone(result.puzzle);
  state.notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
  state.selectedCell = null;
  state.notesMode = false;
  state.mistakes = 0;
  state.hintsRemaining = 3;
  state.history = [];
  state.gameOver = false;
  state.timerSeconds = 0;
  return state;
}

export function loadSharedPuzzle(state, encodedString) {
  const decoded = decode(encodedString);
  if (!decoded) return null;

  state.puzzle = decoded.puzzle;
  state.solution = decoded.solution;
  state.difficulty = decoded.difficulty;
  state.board = clone(decoded.puzzle);
  state.notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
  state.selectedCell = null;
  state.notesMode = false;
  state.mistakes = 0;
  state.hintsRemaining = 3;
  state.history = [];
  state.gameOver = false;
  state.timerSeconds = 0;
  return state;
}

export function selectCell(state, row, col) {
  state.selectedCell = { row, col };
}

export function toggleNotes(state) {
  state.notesMode = !state.notesMode;
}

/**
 * Enter a number into the selected cell.
 * Returns: { type: 'none'|'note'|'correct'|'mistake'|'win'|'game_over', row, col }
 */
export function enterNumber(state, num) {
  if (state.gameOver || !state.selectedCell) return { type: "none" };
  const { row, col } = state.selectedCell;
  if (state.puzzle[row][col] !== 0) return { type: "none" };

  if (state.notesMode) {
    const prevNotes = new Set(state.notes[row][col]);
    if (state.notes[row][col].has(num)) {
      state.notes[row][col].delete(num);
    } else {
      state.notes[row][col].add(num);
    }
    state.history.push({ row, col, prevValue: state.board[row][col], prevNotes, type: "note" });
    return { type: "note", row, col };
  }

  const prevValue = state.board[row][col];
  const prevNotes = new Set(state.notes[row][col]);

  if (num === state.solution[row][col]) {
    state.board[row][col] = num;
    state.notes[row][col].clear();
    clearRelatedNotes(state, row, col, num);
    state.history.push({ row, col, prevValue, prevNotes, type: "correct" });

    if (checkWin(state)) {
      state.gameOver = true;
      return { type: "win", row, col };
    }
    return { type: "correct", row, col };
  } else {
    state.board[row][col] = num;
    state.notes[row][col].clear();
    state.mistakes++;
    state.history.push({ row, col, prevValue, prevNotes, type: "mistake" });

    if (state.mistakes >= state.maxMistakes) {
      state.gameOver = true;
      return { type: "game_over", row, col };
    }
    return { type: "mistake", row, col };
  }
}

export function erase(state) {
  if (state.gameOver || !state.selectedCell) return false;
  const { row, col } = state.selectedCell;
  if (state.puzzle[row][col] !== 0) return false;

  const prevValue = state.board[row][col];
  const prevNotes = new Set(state.notes[row][col]);

  if (prevValue !== 0 || prevNotes.size > 0) {
    state.board[row][col] = 0;
    state.notes[row][col].clear();
    state.history.push({ row, col, prevValue, prevNotes, type: "erase" });
    return true;
  }
  return false;
}

export function undo(state) {
  if (state.gameOver || state.history.length === 0) return false;
  const action = state.history.pop();
  const { row, col, prevValue, prevNotes, type } = action;

  state.board[row][col] = prevValue;
  state.notes[row][col] = prevNotes;

  if (type === "mistake") {
    state.mistakes = Math.max(0, state.mistakes - 1);
  }
  return true;
}

/**
 * Use a hint on the selected cell (or a random empty cell).
 * Returns: { used: boolean, row, col, won: boolean }
 */
export function useHint(state) {
  if (state.gameOver || state.hintsRemaining <= 0) return { used: false };

  let row, col;
  if (
    state.selectedCell &&
    state.board[state.selectedCell.row][state.selectedCell.col] === 0 &&
    state.puzzle[state.selectedCell.row][state.selectedCell.col] === 0
  ) {
    row = state.selectedCell.row;
    col = state.selectedCell.col;
  } else {
    const emptyCells = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (state.board[r][c] === 0) emptyCells.push([r, c]);
      }
    }
    if (emptyCells.length === 0) return { used: false };
    const idx = Math.floor(Math.random() * emptyCells.length);
    [row, col] = emptyCells[idx];
  }

  const prevValue = state.board[row][col];
  const prevNotes = new Set(state.notes[row][col]);
  state.board[row][col] = state.solution[row][col];
  state.notes[row][col].clear();
  clearRelatedNotes(state, row, col, state.solution[row][col]);
  state.hintsRemaining--;
  state.history.push({ row, col, prevValue, prevNotes, type: "hint" });

  const won = checkWin(state);
  if (won) state.gameOver = true;

  return { used: true, row, col, won };
}

export function moveSelection(state, direction) {
  if (!state.selectedCell) {
    state.selectedCell = { row: 0, col: 0 };
    return;
  }
  let { row, col } = state.selectedCell;
  if (direction === "ArrowUp") row = Math.max(0, row - 1);
  if (direction === "ArrowDown") row = Math.min(8, row + 1);
  if (direction === "ArrowLeft") col = Math.max(0, col - 1);
  if (direction === "ArrowRight") col = Math.min(8, col + 1);
  state.selectedCell = { row, col };
}

export function checkWin(state) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (state.board[r][c] !== state.solution[r][c]) return false;
    }
  }
  return true;
}

export function getHighlightInfo(state) {
  if (!state.selectedCell) return { selected: null, highlighted: [], sameNumber: [] };

  const { row, col } = state.selectedCell;
  const selectedValue = state.board[row][col];
  const highlighted = [];
  const sameNumber = [];

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (r === row && c === col) continue;
      if (
        r === row ||
        c === col ||
        (Math.floor(r / 3) === Math.floor(row / 3) && Math.floor(c / 3) === Math.floor(col / 3))
      ) {
        highlighted.push({ row: r, col: c });
      }
      if (selectedValue !== 0 && state.board[r][c] === selectedValue) {
        sameNumber.push({ row: r, col: c });
      }
    }
  }

  return { selected: { row, col }, highlighted, sameNumber };
}

export function getNumpadCompletion(state) {
  const counts = {};
  for (let num = 1; num <= 9; num++) {
    let count = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (state.board[r][c] === num) count++;
      }
    }
    counts[num] = count >= 9;
  }
  return counts;
}

export function formatTime(secs) {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function serializeState(state) {
  return {
    puzzle: state.puzzle,
    solution: state.solution,
    board: state.board,
    notes: state.notes.map((row) => row.map((set) => [...set])),
    difficulty: state.difficulty,
    mistakes: state.mistakes,
    hintsRemaining: state.hintsRemaining,
    timerSeconds: state.timerSeconds,
    gameOver: state.gameOver,
  };
}

export function deserializeState(data) {
  return {
    puzzle: data.puzzle,
    solution: data.solution,
    board: data.board,
    notes: data.notes.map((row) => row.map((arr) => new Set(arr))),
    selectedCell: null,
    notesMode: false,
    mistakes: data.mistakes,
    maxMistakes: 3,
    hintsRemaining: data.hintsRemaining,
    difficulty: data.difficulty,
    timerSeconds: data.timerSeconds,
    history: [],
    gameOver: data.gameOver,
  };
}

export function shareUrl(state, baseUrl) {
  const encoded = encode(state.puzzle, state.solution, state.difficulty);
  return `${baseUrl}?puzzle=${encoded}`;
}

// --- Internal helpers ---

function clearRelatedNotes(state, row, col, num) {
  for (let i = 0; i < 9; i++) {
    state.notes[row][i].delete(num);
    state.notes[i][col].delete(num);
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      state.notes[r][c].delete(num);
    }
  }
}

// Re-export engine functions that the UI might need directly
export { getCandidates, clone };
