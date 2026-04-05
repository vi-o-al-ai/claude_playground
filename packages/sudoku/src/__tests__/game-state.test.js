import { describe, it, expect } from "vitest";
import {
  createGameState,
  selectCell,
  toggleNotes,
  enterNumber,
  erase,
  undo,
  useHint,
  moveSelection,
  checkWin,
  getHighlightInfo,
  getNumpadCompletion,
  formatTime,
  serializeState,
  deserializeState,
  loadSharedPuzzle,
  shareUrl,
} from "../game-state.js";
import { clone, encode } from "../engine.js";
import { PUZZLE, SOLUTION, EMPTY_CELLS } from "./fixtures.js";

/** Create a game state pre-loaded with the fixture puzzle (no generate() call). */
function setupGame() {
  const state = createGameState("easy");
  state.puzzle = clone(PUZZLE);
  state.solution = clone(SOLUTION);
  state.board = clone(PUZZLE);
  state.notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
  return state;
}

describe("createGameState", () => {
  it("creates initial state with defaults", () => {
    const state = createGameState("medium");
    expect(state.difficulty).toBe("medium");
    expect(state.mistakes).toBe(0);
    expect(state.maxMistakes).toBe(3);
    expect(state.hintsRemaining).toBe(3);
    expect(state.gameOver).toBe(false);
    expect(state.notesMode).toBe(false);
    expect(state.selectedCell).toBeNull();
  });
});

describe("selectCell", () => {
  it("sets the selected cell", () => {
    const state = setupGame();
    selectCell(state, 3, 5);
    expect(state.selectedCell).toEqual({ row: 3, col: 5 });
  });
});

describe("toggleNotes", () => {
  it("toggles notes mode", () => {
    const state = setupGame();
    expect(state.notesMode).toBe(false);
    toggleNotes(state);
    expect(state.notesMode).toBe(true);
    toggleNotes(state);
    expect(state.notesMode).toBe(false);
  });
});

describe("enterNumber", () => {
  it("returns none when no cell is selected", () => {
    const state = setupGame();
    expect(enterNumber(state, 5).type).toBe("none");
  });

  it("returns none when selecting a given cell", () => {
    const state = setupGame();
    selectCell(state, 0, 0); // (0,0) = 5 (given)
    expect(enterNumber(state, 5).type).toBe("none");
  });

  it("records correct moves", () => {
    const state = setupGame();
    const { r, c } = EMPTY_CELLS[0]; // First empty cell
    selectCell(state, r, c);
    const correctNum = SOLUTION[r][c];
    const result = enterNumber(state, correctNum);

    expect(result.type).toBe("correct");
    expect(state.board[r][c]).toBe(correctNum);
    expect(state.mistakes).toBe(0);
  });

  it("records mistakes and increments counter", () => {
    const state = setupGame();
    const { r, c } = EMPTY_CELLS[0];
    selectCell(state, r, c);
    const wrongNum = SOLUTION[r][c] === 9 ? 1 : SOLUTION[r][c] + 1;
    const result = enterNumber(state, wrongNum);

    expect(result.type).toBe("mistake");
    expect(state.mistakes).toBe(1);
  });

  it("triggers game over after max mistakes", () => {
    const state = setupGame();

    for (let i = 0; i < 3; i++) {
      const { r, c } = EMPTY_CELLS[i];
      selectCell(state, r, c);
      const wrongNum = SOLUTION[r][c] === 9 ? 1 : SOLUTION[r][c] + 1;
      const result = enterNumber(state, wrongNum);

      if (i === 2) {
        expect(result.type).toBe("game_over");
        expect(state.gameOver).toBe(true);
      }
    }
  });

  it("adds notes in notes mode", () => {
    const state = setupGame();
    toggleNotes(state);
    const { r, c } = EMPTY_CELLS[0];
    selectCell(state, r, c);

    const result = enterNumber(state, 5);
    expect(result.type).toBe("note");
    expect(state.notes[r][c].has(5)).toBe(true);

    // Toggle off
    enterNumber(state, 5);
    expect(state.notes[r][c].has(5)).toBe(false);
  });

  it("detects win when board is complete", () => {
    const state = setupGame();

    for (let i = 0; i < EMPTY_CELLS.length; i++) {
      const { r, c } = EMPTY_CELLS[i];
      selectCell(state, r, c);
      const result = enterNumber(state, SOLUTION[r][c]);

      if (i === EMPTY_CELLS.length - 1) {
        expect(result.type).toBe("win");
        expect(state.gameOver).toBe(true);
      } else {
        expect(result.type).toBe("correct");
      }
    }
  });

  it("clears related notes on correct placement", () => {
    const state = setupGame();
    const { r, c } = EMPTY_CELLS[0];
    const correctNum = SOLUTION[r][c];

    // Add a note in the same row
    const { r: r2, c: c2 } = EMPTY_CELLS[1];
    state.notes[r2][c2].add(correctNum);

    // If they share row/col/box, the note should be cleared
    selectCell(state, r, c);
    enterNumber(state, correctNum);

    if (
      r2 === r ||
      c2 === c ||
      (Math.floor(r2 / 3) === Math.floor(r / 3) && Math.floor(c2 / 3) === Math.floor(c / 3))
    ) {
      expect(state.notes[r2][c2].has(correctNum)).toBe(false);
    }
  });
});

describe("erase", () => {
  it("clears a player-entered value", () => {
    const state = setupGame();
    const { r, c } = EMPTY_CELLS[0];
    selectCell(state, r, c);
    enterNumber(state, SOLUTION[r][c]);
    expect(state.board[r][c]).not.toBe(0);

    expect(erase(state)).toBe(true);
    expect(state.board[r][c]).toBe(0);
  });

  it("cannot erase given cells", () => {
    const state = setupGame();
    selectCell(state, 0, 0); // Given cell
    expect(erase(state)).toBe(false);
  });

  it("returns false for empty cells with no notes", () => {
    const state = setupGame();
    const { r, c } = EMPTY_CELLS[0];
    selectCell(state, r, c);
    expect(erase(state)).toBe(false);
  });
});

describe("undo", () => {
  it("undoes a correct move", () => {
    const state = setupGame();
    const { r, c } = EMPTY_CELLS[0];
    selectCell(state, r, c);
    enterNumber(state, SOLUTION[r][c]);

    expect(undo(state)).toBe(true);
    expect(state.board[r][c]).toBe(0);
  });

  it("reverses mistake counter on undo", () => {
    const state = setupGame();
    const { r, c } = EMPTY_CELLS[0];
    selectCell(state, r, c);
    const wrongNum = SOLUTION[r][c] === 9 ? 1 : SOLUTION[r][c] + 1;
    enterNumber(state, wrongNum);
    expect(state.mistakes).toBe(1);

    undo(state);
    expect(state.mistakes).toBe(0);
  });

  it("returns false when nothing to undo", () => {
    const state = setupGame();
    expect(undo(state)).toBe(false);
  });

  it("restores notes on undo", () => {
    const state = setupGame();
    toggleNotes(state);
    const { r, c } = EMPTY_CELLS[0];
    selectCell(state, r, c);
    enterNumber(state, 3);
    expect(state.notes[r][c].has(3)).toBe(true);

    undo(state);
    expect(state.notes[r][c].has(3)).toBe(false);
  });
});

describe("useHint", () => {
  it("fills in the selected empty cell", () => {
    const state = setupGame();
    const { r, c } = EMPTY_CELLS[0];
    selectCell(state, r, c);
    const result = useHint(state);

    expect(result.used).toBe(true);
    expect(result.row).toBe(r);
    expect(result.col).toBe(c);
    expect(state.board[r][c]).toBe(SOLUTION[r][c]);
    expect(state.hintsRemaining).toBe(2);
  });

  it("does nothing when no hints remaining", () => {
    const state = setupGame();
    state.hintsRemaining = 0;
    expect(useHint(state).used).toBe(false);
  });

  it("picks a random cell if selected cell is given", () => {
    const state = setupGame();
    selectCell(state, 0, 0); // Given cell
    const result = useHint(state);
    expect(result.used).toBe(true);
    // Should have filled some empty cell
    expect(state.board[result.row][result.col]).toBe(SOLUTION[result.row][result.col]);
  });
});

describe("moveSelection", () => {
  it("initializes to 0,0 when no cell selected", () => {
    const state = setupGame();
    moveSelection(state, "ArrowDown");
    expect(state.selectedCell).toEqual({ row: 0, col: 0 });
  });

  it("moves in all directions", () => {
    const state = setupGame();
    selectCell(state, 4, 4);

    moveSelection(state, "ArrowUp");
    expect(state.selectedCell).toEqual({ row: 3, col: 4 });
    moveSelection(state, "ArrowDown");
    expect(state.selectedCell).toEqual({ row: 4, col: 4 });
    moveSelection(state, "ArrowLeft");
    expect(state.selectedCell).toEqual({ row: 4, col: 3 });
    moveSelection(state, "ArrowRight");
    expect(state.selectedCell).toEqual({ row: 4, col: 4 });
  });

  it("clamps at board edges", () => {
    const state = setupGame();
    selectCell(state, 0, 0);
    moveSelection(state, "ArrowUp");
    expect(state.selectedCell).toEqual({ row: 0, col: 0 });
    moveSelection(state, "ArrowLeft");
    expect(state.selectedCell).toEqual({ row: 0, col: 0 });

    selectCell(state, 8, 8);
    moveSelection(state, "ArrowDown");
    expect(state.selectedCell).toEqual({ row: 8, col: 8 });
    moveSelection(state, "ArrowRight");
    expect(state.selectedCell).toEqual({ row: 8, col: 8 });
  });
});

describe("getHighlightInfo", () => {
  it("returns null selected when no cell selected", () => {
    const state = setupGame();
    expect(getHighlightInfo(state).selected).toBeNull();
  });

  it("highlights row, column, and box", () => {
    const state = setupGame();
    selectCell(state, 4, 4);
    const info = getHighlightInfo(state);

    expect(info.selected).toEqual({ row: 4, col: 4 });
    expect(info.highlighted.some((h) => h.row === 4 && h.col !== 4)).toBe(true);
    expect(info.highlighted.some((h) => h.col === 4 && h.row !== 4)).toBe(true);
  });

  it("identifies cells with same number", () => {
    const state = setupGame();
    selectCell(state, 0, 0); // Value is 5
    const info = getHighlightInfo(state);

    // All other cells with value 5 should be in sameNumber
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (r === 0 && c === 0) continue;
        if (state.board[r][c] === 5) {
          expect(info.sameNumber.some((s) => s.row === r && s.col === c)).toBe(true);
        }
      }
    }
  });
});

describe("getNumpadCompletion", () => {
  it("reports completion status for each number", () => {
    const state = setupGame();
    const completion = getNumpadCompletion(state);
    // On a fresh puzzle, no number should be "completed" (placed 9 times)
    // since we have 36 empty cells
    expect(typeof completion[1]).toBe("boolean");
    expect(Object.keys(completion)).toHaveLength(9);
  });
});

describe("formatTime", () => {
  it("formats seconds correctly", () => {
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(59)).toBe("00:59");
    expect(formatTime(60)).toBe("01:00");
    expect(formatTime(125)).toBe("02:05");
    expect(formatTime(3661)).toBe("61:01");
  });
});

describe("serializeState / deserializeState", () => {
  it("round-trips game state", () => {
    const state = setupGame();
    const { r, c } = EMPTY_CELLS[0];
    selectCell(state, r, c);
    enterNumber(state, SOLUTION[r][c]);

    const serialized = serializeState(state);
    const restored = deserializeState(serialized);

    expect(restored.puzzle).toEqual(state.puzzle);
    expect(restored.solution).toEqual(state.solution);
    expect(restored.board).toEqual(state.board);
    expect(restored.difficulty).toBe(state.difficulty);
    expect(restored.mistakes).toBe(state.mistakes);
    expect(restored.selectedCell).toBeNull();
    expect(restored.notesMode).toBe(false);
  });
});

describe("loadSharedPuzzle", () => {
  it("loads a valid encoded puzzle", () => {
    const encoded = encode(PUZZLE, SOLUTION, "easy");
    const state = createGameState();
    const result = loadSharedPuzzle(state, encoded);

    expect(result).not.toBeNull();
    expect(state.puzzle).toEqual(PUZZLE);
    expect(state.solution).toEqual(SOLUTION);
    expect(state.difficulty).toBe("easy");
  });

  it("returns null for invalid encoded string", () => {
    const state = createGameState();
    expect(loadSharedPuzzle(state, "garbage")).toBeNull();
  });
});

describe("shareUrl", () => {
  it("generates a URL with encoded puzzle", () => {
    const state = setupGame();
    const url = shareUrl(state, "https://example.com/sudoku");
    expect(url).toContain("https://example.com/sudoku?puzzle=");
    expect(url.length).toBeGreaterThan(50);
  });
});

describe("checkWin", () => {
  it("returns false for incomplete board", () => {
    const state = setupGame();
    expect(checkWin(state)).toBe(false);
  });

  it("returns true for completed board", () => {
    const state = setupGame();
    state.board = clone(SOLUTION);
    expect(checkWin(state)).toBe(true);
  });
});
