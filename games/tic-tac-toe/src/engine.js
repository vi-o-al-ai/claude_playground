/**
 * Tic-Tac-Toe game engine.
 * Pure logic — no DOM, no side effects. Fully testable.
 */

export const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function createGameState() {
  return {
    board: Array(9).fill(""),
    turn: "X",
    gameOver: false,
    vsComputer: false,
    scores: { X: 0, O: 0, D: 0 },
  };
}

/**
 * Check if there's a winning line on the board.
 * Returns the winning line [a, b, c] or null.
 */
export function checkWin(board) {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return line;
    }
  }
  return null;
}

/**
 * Check if the board is full (draw condition when no winner).
 */
export function isBoardFull(board) {
  return board.every((c) => c);
}

/**
 * Make a move at position i.
 * Returns: { result: 'win'|'draw'|'continue', winLine: number[]|null }
 */
export function makeMove(state, i) {
  if (state.gameOver || state.board[i]) {
    return { result: "invalid", winLine: null };
  }

  state.board[i] = state.turn;
  const winLine = checkWin(state.board);

  if (winLine) {
    state.gameOver = true;
    state.scores[state.turn]++;
    return { result: "win", winLine, winner: state.turn };
  }

  if (isBoardFull(state.board)) {
    state.gameOver = true;
    state.scores.D++;
    return { result: "draw", winLine: null };
  }

  state.turn = state.turn === "X" ? "O" : "X";
  return { result: "continue", winLine: null };
}

/**
 * Find a move that completes a winning line for the given player.
 * Returns the board index or -1 if no such move exists.
 */
export function findWinningMove(board, player) {
  for (const [a, b, c] of WIN_LINES) {
    const vals = [board[a], board[b], board[c]];
    if (vals.filter((v) => v === player).length === 2 && vals.includes("")) {
      return [a, b, c][vals.indexOf("")];
    }
  }
  return -1;
}

/**
 * Compute the computer's move (plays as "O").
 * Strategy: win > block > center > corner > any.
 * Returns the board index to play, or -1 if no move available.
 */
export function computeComputerMove(board) {
  // Try to win
  let move = findWinningMove(board, "O");
  // Block opponent
  if (move === -1) move = findWinningMove(board, "X");
  // Take center
  if (move === -1 && !board[4]) move = 4;
  // Take a corner
  if (move === -1) move = [0, 2, 6, 8].find((i) => !board[i]) ?? -1;
  // Take any
  if (move === -1) move = board.findIndex((c) => !c);
  return move;
}

/**
 * Reset the board for a new round, keeping scores.
 */
export function restart(state) {
  state.board = Array(9).fill("");
  state.turn = "X";
  state.gameOver = false;
}
