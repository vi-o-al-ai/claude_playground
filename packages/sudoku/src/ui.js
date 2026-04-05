/**
 * Sudoku UI controller.
 * Wires DOM events to game-state functions and renders the board.
 */
import {
  createGameState,
  newGame,
  loadSharedPuzzle,
  selectCell,
  toggleNotes,
  enterNumber,
  erase,
  undo,
  useHint,
  moveSelection,
  getHighlightInfo,
  getNumpadCompletion,
  formatTime,
  serializeState,
  deserializeState,
  shareUrl,
} from "./game-state.js";

let state = createGameState("easy");
let timerInterval = null;

const boardEl = document.getElementById("board");
const timerEl = document.getElementById("timer");
const mistakesEl = document.getElementById("mistakes-counter");
const hintCountEl = document.getElementById("hint-count");

// --- Initialize ---
function init() {
  checkSharedPuzzle();
  setupEventListeners();
  startNewGame();
}

function checkSharedPuzzle() {
  const params = new URLSearchParams(window.location.search);
  const shared = params.get("puzzle");
  if (shared) {
    const result = loadSharedPuzzle(state, shared);
    if (result) {
      setActiveDifficulty(state.difficulty);
      renderAll();
      startTimer();
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
  }
}

function setupEventListeners() {
  document.querySelectorAll(".diff-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.difficulty = btn.dataset.difficulty;
      setActiveDifficulty(state.difficulty);
      startNewGame();
    });
  });

  document.querySelectorAll(".num-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      handleEnterNumber(parseInt(btn.dataset.num));
    });
  });

  document.getElementById("btn-undo").addEventListener("click", handleUndo);
  document.getElementById("btn-erase").addEventListener("click", handleErase);
  document.getElementById("btn-notes").addEventListener("click", handleToggleNotes);
  document.getElementById("btn-hint").addEventListener("click", handleHint);
  document.getElementById("btn-new").addEventListener("click", () => startNewGame());
  document.getElementById("btn-save").addEventListener("click", handleSave);
  document.getElementById("btn-load").addEventListener("click", handleLoad);
  document.getElementById("btn-share").addEventListener("click", handleShare);
  document.addEventListener("keydown", handleKeyboard);
}

// --- Game Actions ---

function startNewGame() {
  stopTimer();
  newGame(state);
  renderAll();
  startTimer();
}

function handleEnterNumber(num) {
  const result = enterNumber(state, num);
  if (result.type === "none") return;

  renderAll();
  selectCell(state, result.row, result.col);
  renderHighlights();

  if (result.type === "correct") {
    animateCell(result.row, result.col, "correct-reveal");
  } else if (result.type === "win") {
    animateCell(result.row, result.col, "correct-reveal");
    handleWin();
  } else if (result.type === "mistake") {
    updateMistakes();
  } else if (result.type === "game_over") {
    updateMistakes();
    handleGameOver();
  }
}

function handleErase() {
  if (erase(state)) {
    renderAll();
  }
}

function handleUndo() {
  if (undo(state)) {
    updateMistakes();
    renderAll();
  }
}

function handleToggleNotes() {
  toggleNotes(state);
  document.getElementById("btn-notes").classList.toggle("active", state.notesMode);
}

function handleHint() {
  const result = useHint(state);
  if (!result.used) return;

  updateHintCount();
  renderAll();
  selectCell(state, result.row, result.col);
  renderHighlights();
  animateCell(result.row, result.col, "hint-reveal");

  if (result.won) handleWin();
}

function handleKeyboard(e) {
  if (state.gameOver) return;

  if (e.key >= "1" && e.key <= "9") {
    handleEnterNumber(parseInt(e.key));
  } else if (e.key === "Backspace" || e.key === "Delete") {
    handleErase();
  } else if (e.key === "n" || e.key === "N") {
    handleToggleNotes();
  } else if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    handleUndo();
  } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
    e.preventDefault();
    moveSelection(state, e.key);
    renderHighlights();
  }
}

// --- Rendering ---

function renderAll() {
  renderBoard();
  renderHighlights();
  updateNumpadCompletion();
  updateMistakes();
  updateHintCount();
}

function renderBoard() {
  boardEl.innerHTML = "";
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = r;
      cell.dataset.col = c;

      if (state.puzzle[r][c] !== 0) {
        cell.textContent = state.puzzle[r][c];
        cell.classList.add("given");
      } else if (state.board[r][c] !== 0) {
        cell.textContent = state.board[r][c];
        if (state.board[r][c] !== state.solution[r][c]) {
          cell.classList.add("error");
        }
      } else if (state.notes[r][c].size > 0) {
        const grid = document.createElement("div");
        grid.className = "notes-grid";
        for (let n = 1; n <= 9; n++) {
          const span = document.createElement("span");
          span.textContent = state.notes[r][c].has(n) ? n : "";
          grid.appendChild(span);
        }
        cell.appendChild(grid);
      }

      cell.addEventListener("click", () => {
        selectCell(state, r, c);
        renderHighlights();
      });
      boardEl.appendChild(cell);
    }
  }
}

function renderHighlights() {
  const info = getHighlightInfo(state);
  const cells = boardEl.querySelectorAll(".cell");
  cells.forEach((cell) => cell.classList.remove("selected", "highlighted", "same-number"));

  if (!info.selected) return;

  const getCell = (r, c) => boardEl.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);

  const sel = getCell(info.selected.row, info.selected.col);
  if (sel) sel.classList.add("selected");

  info.highlighted.forEach(({ row, col }) => {
    const el = getCell(row, col);
    if (el) el.classList.add("highlighted");
  });

  info.sameNumber.forEach(({ row, col }) => {
    const el = getCell(row, col);
    if (el) el.classList.add("same-number");
  });
}

function updateNumpadCompletion() {
  const completion = getNumpadCompletion(state);
  for (let num = 1; num <= 9; num++) {
    const btn = document.querySelector(`.num-btn[data-num="${num}"]`);
    btn.classList.toggle("completed", completion[num]);
  }
}

function updateMistakes() {
  mistakesEl.textContent = `Mistakes: ${state.mistakes} / ${state.maxMistakes}`;
  mistakesEl.classList.toggle("warning", state.mistakes >= state.maxMistakes - 1);
}

function updateHintCount() {
  hintCountEl.textContent = `(${state.hintsRemaining})`;
}

function setActiveDifficulty(diff) {
  document.querySelectorAll(".diff-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.difficulty === diff);
  });
}

function animateCell(row, col, className) {
  const cell = boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
  if (cell) {
    cell.classList.add(className);
    setTimeout(() => cell.classList.remove(className), 700);
  }
}

// --- Timer ---

function startTimer() {
  stopTimer();
  timerEl.textContent = formatTime(state.timerSeconds);
  timerInterval = setInterval(() => {
    state.timerSeconds++;
    timerEl.textContent = formatTime(state.timerSeconds);
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// --- Win / Game Over ---

function handleWin() {
  stopTimer();
  boardEl.classList.add("board-win");
  setTimeout(() => boardEl.classList.remove("board-win"), 1000);

  showModal(
    "Congratulations!",
    `You solved the ${state.difficulty} puzzle in ${formatTime(state.timerSeconds)} with ${state.mistakes} mistake${state.mistakes !== 1 ? "s" : ""}.`,
    [
      {
        text: "New Game",
        class: "modal-btn-primary",
        action: () => {
          hideModal();
          startNewGame();
        },
      },
      {
        text: "Share",
        class: "modal-btn-secondary",
        action: () => {
          hideModal();
          handleShare();
        },
      },
    ],
  );
}

function handleGameOver() {
  stopTimer();
  showModal("Game Over", `You made ${state.maxMistakes} mistakes. Better luck next time!`, [
    {
      text: "Try Again",
      class: "modal-btn-primary",
      action: () => {
        hideModal();
        startNewGame();
      },
    },
    { text: "Close", class: "modal-btn-secondary", action: hideModal },
  ]);
}

// --- Modal ---

function showModal(title, message, buttons) {
  const overlay = document.getElementById("modal-overlay");
  const content = document.getElementById("modal-content");
  const actions = document.getElementById("modal-actions");

  content.innerHTML = `<h2>${title}</h2><p>${message}</p>`;
  actions.innerHTML = "";

  buttons.forEach((b) => {
    const btn = document.createElement("button");
    btn.textContent = b.text;
    btn.className = b.class;
    btn.addEventListener("click", b.action);
    actions.appendChild(btn);
  });

  overlay.classList.remove("hidden");
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) hideModal();
  });
}

function hideModal() {
  document.getElementById("modal-overlay").classList.add("hidden");
}

// --- Save / Load ---

function handleSave() {
  const data = serializeState(state);
  localStorage.setItem("sudoku_save", JSON.stringify(data));
  showModal("Game Saved", "Your progress has been saved. You can resume anytime.", [
    { text: "OK", class: "modal-btn-primary", action: hideModal },
  ]);
}

function handleLoad() {
  const raw = localStorage.getItem("sudoku_save");
  if (!raw) {
    showModal("No Saved Game", "There is no saved game to resume.", [
      { text: "OK", class: "modal-btn-primary", action: hideModal },
    ]);
    return;
  }

  try {
    const data = JSON.parse(raw);
    state = deserializeState(data);
    setActiveDifficulty(state.difficulty);
    renderAll();
    document.getElementById("btn-notes").classList.remove("active");
    if (!state.gameOver) {
      startTimer();
    } else {
      timerEl.textContent = formatTime(state.timerSeconds);
    }
    showModal("Game Resumed", `Your ${state.difficulty} game has been loaded.`, [
      { text: "OK", class: "modal-btn-primary", action: hideModal },
    ]);
  } catch {
    showModal("Error", "Could not load saved game. The save data may be corrupted.", [
      { text: "OK", class: "modal-btn-primary", action: hideModal },
    ]);
  }
}

// --- Share ---

function handleShare() {
  const url = shareUrl(state, `${window.location.origin}${window.location.pathname}`);
  const overlay = document.getElementById("modal-overlay");
  const content = document.getElementById("modal-content");
  const actions = document.getElementById("modal-actions");

  content.innerHTML = `
    <h2>Share Puzzle</h2>
    <p>Share this ${state.difficulty} puzzle with friends:</p>
    <div id="share-link-box">
      <input type="text" id="share-url" value="${url}" readonly>
      <button id="copy-btn">Copy</button>
    </div>
  `;
  actions.innerHTML = `<button class="modal-btn-secondary" id="share-close">Close</button>`;
  overlay.classList.remove("hidden");

  document.getElementById("copy-btn").addEventListener("click", () => {
    const input = document.getElementById("share-url");
    input.select();
    navigator.clipboard
      .writeText(url)
      .then(() => {
        document.getElementById("copy-btn").textContent = "Copied!";
        setTimeout(() => {
          const btn = document.getElementById("copy-btn");
          if (btn) btn.textContent = "Copy";
        }, 2000);
      })
      .catch(() => {
        document.execCommand("copy");
        document.getElementById("copy-btn").textContent = "Copied!";
      });
  });

  document.getElementById("share-close").addEventListener("click", hideModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) hideModal();
  });
}

// --- Start ---
document.addEventListener("DOMContentLoaded", init);
