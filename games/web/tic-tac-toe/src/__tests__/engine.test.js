import { describe, it, expect } from "vitest";
import {
  WIN_LINES,
  createGameState,
  checkWin,
  isBoardFull,
  makeMove,
  findWinningMove,
  computeComputerMove,
  restart,
} from "../engine.js";

describe("WIN_LINES", () => {
  it("has 8 winning combinations", () => {
    expect(WIN_LINES).toHaveLength(8);
  });

  it("includes all rows, columns, and diagonals", () => {
    // Rows
    expect(WIN_LINES).toContainEqual([0, 1, 2]);
    expect(WIN_LINES).toContainEqual([3, 4, 5]);
    expect(WIN_LINES).toContainEqual([6, 7, 8]);
    // Columns
    expect(WIN_LINES).toContainEqual([0, 3, 6]);
    expect(WIN_LINES).toContainEqual([1, 4, 7]);
    expect(WIN_LINES).toContainEqual([2, 5, 8]);
    // Diagonals
    expect(WIN_LINES).toContainEqual([0, 4, 8]);
    expect(WIN_LINES).toContainEqual([2, 4, 6]);
  });
});

describe("createGameState", () => {
  it("creates a fresh game state", () => {
    const state = createGameState();
    expect(state.board).toEqual(Array(9).fill(""));
    expect(state.turn).toBe("X");
    expect(state.gameOver).toBe(false);
    expect(state.vsComputer).toBe(false);
    expect(state.scores).toEqual({ X: 0, O: 0, D: 0 });
  });
});

describe("checkWin", () => {
  it("returns null for empty board", () => {
    expect(checkWin(Array(9).fill(""))).toBeNull();
  });

  it("detects horizontal wins", () => {
    const board = ["X", "X", "X", "", "", "", "", "", ""];
    expect(checkWin(board)).toEqual([0, 1, 2]);
  });

  it("detects vertical wins", () => {
    const board = ["O", "", "", "O", "", "", "O", "", ""];
    expect(checkWin(board)).toEqual([0, 3, 6]);
  });

  it("detects diagonal wins", () => {
    const board = ["X", "", "", "", "X", "", "", "", "X"];
    expect(checkWin(board)).toEqual([0, 4, 8]);
  });

  it("detects anti-diagonal wins", () => {
    const board = ["", "", "O", "", "O", "", "O", "", ""];
    expect(checkWin(board)).toEqual([2, 4, 6]);
  });

  it("returns null when no win exists", () => {
    const board = ["X", "O", "X", "X", "O", "O", "O", "X", "X"];
    expect(checkWin(board)).toBeNull();
  });
});

describe("isBoardFull", () => {
  it("returns false for empty board", () => {
    expect(isBoardFull(Array(9).fill(""))).toBe(false);
  });

  it("returns false for partially filled board", () => {
    const board = ["X", "O", "", "X", "", "", "", "", ""];
    expect(isBoardFull(board)).toBe(false);
  });

  it("returns true for full board", () => {
    const board = ["X", "O", "X", "O", "X", "O", "O", "X", "O"];
    expect(isBoardFull(board)).toBe(true);
  });
});

describe("makeMove", () => {
  it("places the current player's mark", () => {
    const state = createGameState();
    makeMove(state, 0);
    expect(state.board[0]).toBe("X");
  });

  it("alternates turns", () => {
    const state = createGameState();
    makeMove(state, 0); // X
    expect(state.turn).toBe("O");
    makeMove(state, 1); // O
    expect(state.turn).toBe("X");
  });

  it("returns invalid for occupied cells", () => {
    const state = createGameState();
    makeMove(state, 0);
    const result = makeMove(state, 0);
    expect(result.result).toBe("invalid");
  });

  it("returns invalid when game is over", () => {
    const state = createGameState();
    state.gameOver = true;
    const result = makeMove(state, 0);
    expect(result.result).toBe("invalid");
  });

  it("detects a win", () => {
    const state = createGameState();
    makeMove(state, 0); // X
    makeMove(state, 3); // O
    makeMove(state, 1); // X
    makeMove(state, 4); // O
    const result = makeMove(state, 2); // X wins top row

    expect(result.result).toBe("win");
    expect(result.winLine).toEqual([0, 1, 2]);
    expect(result.winner).toBe("X");
    expect(state.gameOver).toBe(true);
    expect(state.scores.X).toBe(1);
  });

  it("detects a draw", () => {
    const state = createGameState();
    // X O X
    // X X O
    // O X O
    const moves = [0, 1, 2, 4, 3, 5, 7, 6, 8];
    let result;
    for (const m of moves) {
      result = makeMove(state, m);
    }
    expect(result.result).toBe("draw");
    expect(state.gameOver).toBe(true);
    expect(state.scores.D).toBe(1);
  });

  it("returns continue for normal moves", () => {
    const state = createGameState();
    const result = makeMove(state, 4);
    expect(result.result).toBe("continue");
    expect(result.winLine).toBeNull();
  });
});

describe("findWinningMove", () => {
  it("finds a winning move when two in a row", () => {
    const board = ["X", "X", "", "", "", "", "", "", ""];
    expect(findWinningMove(board, "X")).toBe(2);
  });

  it("finds a winning move in a column", () => {
    const board = ["O", "", "", "O", "", "", "", "", ""];
    expect(findWinningMove(board, "O")).toBe(6);
  });

  it("returns -1 when no winning move exists", () => {
    const board = ["X", "", "O", "", "", "", "", "", ""];
    expect(findWinningMove(board, "X")).toBe(-1);
  });

  it("finds winning move on diagonal", () => {
    const board = ["X", "", "", "", "X", "", "", "", ""];
    expect(findWinningMove(board, "X")).toBe(8);
  });
});

describe("computeComputerMove", () => {
  it("takes a winning move when available", () => {
    const board = ["O", "O", "", "X", "X", "", "", "", ""];
    expect(computeComputerMove(board)).toBe(2); // O wins
  });

  it("blocks opponent's winning move", () => {
    const board = ["X", "X", "", "", "O", "", "", "", ""];
    expect(computeComputerMove(board)).toBe(2); // Block X
  });

  it("prefers center when available", () => {
    const board = ["X", "", "", "", "", "", "", "", ""];
    expect(computeComputerMove(board)).toBe(4);
  });

  it("takes a corner when center is taken", () => {
    const board = ["", "", "", "", "X", "", "", "", ""];
    const move = computeComputerMove(board);
    expect([0, 2, 6, 8]).toContain(move);
  });

  it("takes any available cell when nothing else", () => {
    const board = ["X", "O", "X", "O", "X", "O", "", "X", "O"];
    expect(computeComputerMove(board)).toBe(6);
  });

  it("prefers winning over blocking", () => {
    // O can win at position 2, but X also threatens at position 5
    const board = ["O", "O", "", "X", "X", "", "", "", ""];
    expect(computeComputerMove(board)).toBe(2); // Win > block
  });
});

describe("restart", () => {
  it("clears the board but keeps scores", () => {
    const state = createGameState();
    makeMove(state, 0); // X at 0
    makeMove(state, 3); // O at 3
    makeMove(state, 1); // X at 1
    makeMove(state, 4); // O at 4
    makeMove(state, 2); // X wins
    expect(state.scores.X).toBe(1);

    restart(state);
    expect(state.board).toEqual(Array(9).fill(""));
    expect(state.turn).toBe("X");
    expect(state.gameOver).toBe(false);
    expect(state.scores.X).toBe(1); // Score preserved
  });
});
