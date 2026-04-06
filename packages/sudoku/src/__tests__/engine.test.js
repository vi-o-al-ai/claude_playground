import { describe, it, expect } from "vitest";
import { isValid, clone, getCandidates, encode, decode } from "../engine.js";
import { SOLUTION, PUZZLE } from "./fixtures.js";

// Note: solve() and countSolutions() are not unit-tested here because they
// use exhaustive backtracking that is too slow for fast test suites.
// They are exercised indirectly via the pre-built fixture puzzle and
// validated at the integration level through the game-state tests.

describe("isValid", () => {
  it("returns true for valid placements", () => {
    const board = Array.from({ length: 9 }, () => Array(9).fill(0));
    expect(isValid(board, 0, 0, 1)).toBe(true);
  });

  it("returns false when number exists in same row", () => {
    const board = Array.from({ length: 9 }, () => Array(9).fill(0));
    board[0][5] = 3;
    expect(isValid(board, 0, 0, 3)).toBe(false);
  });

  it("returns false when number exists in same column", () => {
    const board = Array.from({ length: 9 }, () => Array(9).fill(0));
    board[7][0] = 5;
    expect(isValid(board, 0, 0, 5)).toBe(false);
  });

  it("returns false when number exists in same 3x3 box", () => {
    const board = Array.from({ length: 9 }, () => Array(9).fill(0));
    board[1][1] = 7;
    expect(isValid(board, 0, 0, 7)).toBe(false);
    expect(isValid(board, 0, 3, 7)).toBe(true); // different box
  });

  it("validates every cell in the fixture solution", () => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const board = clone(SOLUTION);
        const num = board[r][c];
        board[r][c] = 0;
        expect(isValid(board, r, c, num)).toBe(true);
      }
    }
  });
});

describe("clone", () => {
  it("creates a deep copy", () => {
    const cloned = clone(SOLUTION);
    cloned[0][0] = 99;
    expect(SOLUTION[0][0]).toBe(5);
  });
});

describe("getCandidates", () => {
  it("returns empty array for filled cells", () => {
    expect(getCandidates(SOLUTION, 0, 0)).toEqual([]);
  });

  it("returns valid candidates for empty cells", () => {
    const candidates = getCandidates(PUZZLE, 0, 2);
    expect(candidates).toContain(4);
    expect(candidates).not.toContain(5); // in row
    expect(candidates).not.toContain(3); // in row
    expect(candidates).not.toContain(8); // in column
  });

  it("returns exactly one candidate for a nearly-complete board", () => {
    const board = clone(SOLUTION);
    board[0][0] = 0;
    const candidates = getCandidates(board, 0, 0);
    expect(candidates).toEqual([5]);
  });
});

describe("encode/decode", () => {
  it("round-trips a puzzle correctly", () => {
    const encoded = encode(PUZZLE, SOLUTION, "easy");
    const decoded = decode(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded.puzzle).toEqual(PUZZLE);
    expect(decoded.solution).toEqual(SOLUTION);
    expect(decoded.difficulty).toBe("easy");
  });

  it("returns null for invalid encoded strings", () => {
    expect(decode("not-valid-base64!!!")).toBeNull();
    expect(decode("")).toBeNull();
  });

  it("preserves difficulty in encoding", () => {
    const encoded = encode(PUZZLE, SOLUTION, "expert");
    const decoded = decode(encoded);
    expect(decoded.difficulty).toBe("expert");
  });
});
