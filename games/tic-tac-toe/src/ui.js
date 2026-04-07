/**
 * Tic-Tac-Toe UI controller.
 * Wires DOM events to engine functions.
 */
import { createGameState, makeMove, computeComputerMove, restart } from "./engine.js";
import { GameHeader, GameOver } from "@arcade/shared-ui";

const state = createGameState();
const gameOverOverlay = new GameOver();

// Add shared GameHeader with mode toggle
new GameHeader({
  title: "Tic Tac Toe",
  settings: [
    {
      label: "vs Computer",
      type: "toggle",
      checked: false,
      onChange: (on) => {
        state.vsComputer = on;
        window.restart();
      },
    },
  ],
  container: document.querySelector(".container"),
});

function renderBoard() {
  const el = document.getElementById("board");
  el.innerHTML = "";
  state.board.forEach((val, i) => {
    const cell = document.createElement("div");
    cell.className = "cell" + (val ? " taken " + val.toLowerCase() : "");
    cell.textContent = val;
    cell.addEventListener("click", () => play(i));
    cell.dataset.index = i;
    el.appendChild(cell);
  });
}

function play(i) {
  if (state.gameOver || state.board[i]) return;
  if (state.vsComputer && state.turn === "O") return;

  handleMove(i);

  if (state.vsComputer && !state.gameOver && state.turn === "O") {
    setTimeout(computerMove, 300);
  }
}

function handleMove(i) {
  const result = makeMove(state, i);

  if (result.result === "invalid") return;

  if (result.result === "win") {
    updateScores();
    renderBoard();
    highlightWin(result.winLine);
    document.getElementById("status").textContent = result.winner + " wins!";
    gameOverOverlay.show({
      title: result.winner + " Wins!",
      stats: [
        { label: "X", value: String(state.scores.X) },
        { label: "Draw", value: String(state.scores.D) },
        { label: "O", value: String(state.scores.O) },
      ],
      onRestart: () => window.restart(),
      restartLabel: "New Game",
    });
    return;
  }

  if (result.result === "draw") {
    updateScores();
    renderBoard();
    document.getElementById("status").textContent = "It's a draw!";
    gameOverOverlay.show({
      title: "It's a Draw!",
      stats: [
        { label: "X", value: String(state.scores.X) },
        { label: "Draw", value: String(state.scores.D) },
        { label: "O", value: String(state.scores.O) },
      ],
      onRestart: () => window.restart(),
      restartLabel: "New Game",
    });
    return;
  }

  renderBoard();
  updateStatus();
}

function computerMove() {
  const move = computeComputerMove(state.board);
  if (move !== -1) handleMove(move);
}

function highlightWin(line) {
  const cells = document.querySelectorAll(".cell");
  line.forEach((i) => cells[i].classList.add("win-cell"));
}

function updateStatus() {
  document.getElementById("status").textContent = state.turn + "'s turn";
}

function updateScores() {
  document.getElementById("score-x").textContent = state.scores.X;
  document.getElementById("score-o").textContent = state.scores.O;
  document.getElementById("score-d").textContent = state.scores.D;
}

// Exposed to onclick handlers in HTML
window.restart = function () {
  restart(state);
  renderBoard();
  updateStatus();
};

window.toggleMode = function () {
  state.vsComputer = !state.vsComputer;
  document.getElementById("mode-btn").textContent = state.vsComputer ? "vs Player" : "vs Computer";
  window.restart();
};

// Initialize
renderBoard();
updateStatus();
