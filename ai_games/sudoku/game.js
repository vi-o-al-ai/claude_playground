/**
 * Sudoku game controller: UI, input handling, hints, save/load, sharing.
 */
const Game = (() => {
  let puzzle = []; // Original puzzle (given cells)
  let solution = []; // Complete solution
  let board = []; // Current player board
  let notes = []; // Notes: notes[r][c] = Set of numbers
  let selectedCell = null; // { row, col }
  let notesMode = false;
  let mistakes = 0;
  const maxMistakes = 3;
  let hintsRemaining = 3;
  let difficulty = "easy";
  let timerSeconds = 0;
  let timerInterval = null;
  let history = []; // Undo stack: { row, col, prevValue, prevNotes, type }
  let gameOver = false;

  const boardEl = document.getElementById("board");
  const timerEl = document.getElementById("timer");
  const mistakesEl = document.getElementById("mistakes-counter");
  const hintCountEl = document.getElementById("hint-count");

  // Initialize
  function init() {
    checkSharedPuzzle();
    setupEventListeners();
    newGame();
  }

  // Check URL for shared puzzle
  function checkSharedPuzzle() {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("puzzle");
    if (shared) {
      const decoded = Sudoku.decode(shared);
      if (decoded) {
        puzzle = decoded.puzzle;
        solution = decoded.solution;
        difficulty = decoded.difficulty;
        board = Sudoku.clone(puzzle);
        notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
        setActiveDifficulty(difficulty);
        resetGameState();
        renderBoard();
        startTimer();
        // Clean URL without reload
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }
    }
  }

  function setupEventListeners() {
    // Difficulty buttons
    document.querySelectorAll(".diff-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        difficulty = btn.dataset.difficulty;
        setActiveDifficulty(difficulty);
        newGame();
      });
    });

    // Numpad
    document.querySelectorAll(".num-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const num = parseInt(btn.dataset.num);
        enterNumber(num);
      });
    });

    // Controls
    document.getElementById("btn-undo").addEventListener("click", undo);
    document.getElementById("btn-erase").addEventListener("click", erase);
    document.getElementById("btn-notes").addEventListener("click", toggleNotes);
    document.getElementById("btn-hint").addEventListener("click", useHint);

    // Actions
    document.getElementById("btn-new").addEventListener("click", () => newGame());
    document.getElementById("btn-save").addEventListener("click", saveGame);
    document.getElementById("btn-load").addEventListener("click", loadGame);
    document.getElementById("btn-share").addEventListener("click", shareGame);

    // Keyboard
    document.addEventListener("keydown", handleKeyboard);
  }

  function handleKeyboard(e) {
    if (gameOver) return;

    if (e.key >= "1" && e.key <= "9") {
      enterNumber(parseInt(e.key));
    } else if (e.key === "Backspace" || e.key === "Delete") {
      erase();
    } else if (e.key === "n" || e.key === "N") {
      toggleNotes();
    } else if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      undo();
    } else if (
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight"
    ) {
      e.preventDefault();
      moveSelection(e.key);
    }
  }

  function moveSelection(key) {
    if (!selectedCell) {
      selectCell(0, 0);
      return;
    }
    let { row, col } = selectedCell;
    if (key === "ArrowUp") row = Math.max(0, row - 1);
    if (key === "ArrowDown") row = Math.min(8, row + 1);
    if (key === "ArrowLeft") col = Math.max(0, col - 1);
    if (key === "ArrowRight") col = Math.min(8, col + 1);
    selectCell(row, col);
  }

  function setActiveDifficulty(diff) {
    document.querySelectorAll(".diff-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.difficulty === diff);
    });
  }

  function newGame() {
    stopTimer();
    const result = Sudoku.generate(difficulty);
    puzzle = result.puzzle;
    solution = result.solution;
    board = Sudoku.clone(puzzle);
    notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
    resetGameState();
    renderBoard();
    startTimer();
  }

  function resetGameState() {
    selectedCell = null;
    notesMode = false;
    mistakes = 0;
    hintsRemaining = 3;
    history = [];
    gameOver = false;
    timerSeconds = 0;
    updateMistakes();
    updateHintCount();
    document.getElementById("btn-notes").classList.remove("active");
  }

  // Rendering
  function renderBoard() {
    boardEl.innerHTML = "";
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.row = r;
        cell.dataset.col = c;

        if (puzzle[r][c] !== 0) {
          cell.textContent = puzzle[r][c];
          cell.classList.add("given");
        } else if (board[r][c] !== 0) {
          cell.textContent = board[r][c];
          if (board[r][c] !== solution[r][c]) {
            cell.classList.add("error");
          }
        } else if (notes[r][c].size > 0) {
          const grid = document.createElement("div");
          grid.className = "notes-grid";
          for (let n = 1; n <= 9; n++) {
            const span = document.createElement("span");
            span.textContent = notes[r][c].has(n) ? n : "";
            grid.appendChild(span);
          }
          cell.appendChild(grid);
        }

        cell.addEventListener("click", () => selectCell(r, c));
        boardEl.appendChild(cell);
      }
    }
    updateHighlights();
    updateNumpadCompletion();
  }

  function selectCell(row, col) {
    selectedCell = { row, col };
    updateHighlights();
  }

  function updateHighlights() {
    const cells = boardEl.querySelectorAll(".cell");
    cells.forEach((cell) => {
      cell.classList.remove("selected", "highlighted", "same-number");
    });

    if (!selectedCell) return;

    const { row, col } = selectedCell;
    const selectedValue = board[row][col];

    cells.forEach((cell) => {
      const r = parseInt(cell.dataset.row);
      const c = parseInt(cell.dataset.col);

      if (r === row && c === col) {
        cell.classList.add("selected");
      } else if (
        r === row ||
        c === col ||
        (Math.floor(r / 3) === Math.floor(row / 3) && Math.floor(c / 3) === Math.floor(col / 3))
      ) {
        cell.classList.add("highlighted");
      }

      if (selectedValue !== 0 && board[r][c] === selectedValue && !(r === row && c === col)) {
        cell.classList.add("same-number");
      }
    });
  }

  function updateNumpadCompletion() {
    for (let num = 1; num <= 9; num++) {
      let count = 0;
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c] === num) count++;
        }
      }
      const btn = document.querySelector(`.num-btn[data-num="${num}"]`);
      btn.classList.toggle("completed", count >= 9);
    }
  }

  // Input
  function enterNumber(num) {
    if (gameOver || !selectedCell) return;
    const { row, col } = selectedCell;
    if (puzzle[row][col] !== 0) return; // Given cell

    if (notesMode) {
      const prevNotes = new Set(notes[row][col]);
      if (notes[row][col].has(num)) {
        notes[row][col].delete(num);
      } else {
        notes[row][col].add(num);
      }
      history.push({ row, col, prevValue: board[row][col], prevNotes, type: "note" });
      renderBoard();
      selectCell(row, col);
      return;
    }

    const prevValue = board[row][col];
    const prevNotes = new Set(notes[row][col]);

    if (num === solution[row][col]) {
      board[row][col] = num;
      notes[row][col].clear();
      // Remove this number from notes in same row/col/box
      clearRelatedNotes(row, col, num);
      history.push({ row, col, prevValue, prevNotes, type: "correct" });
      renderBoard();
      selectCell(row, col);
      animateCell(row, col, "correct-reveal");
      if (checkWin()) handleWin();
    } else {
      board[row][col] = num;
      notes[row][col].clear();
      mistakes++;
      history.push({ row, col, prevValue, prevNotes, type: "mistake" });
      updateMistakes();
      renderBoard();
      selectCell(row, col);
      if (mistakes >= maxMistakes) handleGameOver();
    }
  }

  function clearRelatedNotes(row, col, num) {
    for (let i = 0; i < 9; i++) {
      notes[row][i].delete(num);
      notes[i][col].delete(num);
    }
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        notes[r][c].delete(num);
      }
    }
  }

  function erase() {
    if (gameOver || !selectedCell) return;
    const { row, col } = selectedCell;
    if (puzzle[row][col] !== 0) return;

    const prevValue = board[row][col];
    const prevNotes = new Set(notes[row][col]);

    if (prevValue !== 0 || prevNotes.size > 0) {
      board[row][col] = 0;
      notes[row][col].clear();
      history.push({ row, col, prevValue, prevNotes, type: "erase" });
      renderBoard();
      selectCell(row, col);
    }
  }

  function undo() {
    if (gameOver || history.length === 0) return;
    const action = history.pop();
    const { row, col, prevValue, prevNotes, type } = action;

    board[row][col] = prevValue;
    notes[row][col] = prevNotes;

    if (type === "mistake") {
      mistakes = Math.max(0, mistakes - 1);
      updateMistakes();
    }

    renderBoard();
    selectCell(row, col);
  }

  function toggleNotes() {
    notesMode = !notesMode;
    document.getElementById("btn-notes").classList.toggle("active", notesMode);
  }

  // Hints
  function useHint() {
    if (gameOver || hintsRemaining <= 0) return;

    // If a cell is selected and it's empty, hint that cell
    // Otherwise find a random empty cell
    let row, col;
    if (
      selectedCell &&
      board[selectedCell.row][selectedCell.col] === 0 &&
      puzzle[selectedCell.row][selectedCell.col] === 0
    ) {
      row = selectedCell.row;
      col = selectedCell.col;
    } else {
      const emptyCells = [];
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c] === 0) emptyCells.push([r, c]);
        }
      }
      if (emptyCells.length === 0) return;
      const idx = Math.floor(Math.random() * emptyCells.length);
      [row, col] = emptyCells[idx];
    }

    const prevValue = board[row][col];
    const prevNotes = new Set(notes[row][col]);
    board[row][col] = solution[row][col];
    notes[row][col].clear();
    clearRelatedNotes(row, col, solution[row][col]);
    hintsRemaining--;
    updateHintCount();
    history.push({ row, col, prevValue, prevNotes, type: "hint" });

    renderBoard();
    selectCell(row, col);
    animateCell(row, col, "hint-reveal");

    if (checkWin()) handleWin();
  }

  function updateHintCount() {
    hintCountEl.textContent = `(${hintsRemaining})`;
  }

  function updateMistakes() {
    mistakesEl.textContent = `Mistakes: ${mistakes} / ${maxMistakes}`;
    mistakesEl.classList.toggle("warning", mistakes >= maxMistakes - 1);
  }

  function animateCell(row, col, className) {
    const cell = boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
      cell.classList.add(className);
      setTimeout(() => cell.classList.remove(className), 700);
    }
  }

  // Timer
  function startTimer() {
    stopTimer();
    timerEl.textContent = formatTime(timerSeconds);
    timerInterval = setInterval(() => {
      timerSeconds++;
      timerEl.textContent = formatTime(timerSeconds);
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function formatTime(secs) {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  // Win / Game Over
  function checkWin() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] !== solution[r][c]) return false;
      }
    }
    return true;
  }

  function handleWin() {
    gameOver = true;
    stopTimer();
    boardEl.classList.add("board-win");
    setTimeout(() => boardEl.classList.remove("board-win"), 1000);

    showModal(
      "Congratulations!",
      `You solved the ${difficulty} puzzle in ${formatTime(timerSeconds)} with ${mistakes} mistake${mistakes !== 1 ? "s" : ""}.`,
      [
        {
          text: "New Game",
          class: "modal-btn-primary",
          action: () => {
            hideModal();
            newGame();
          },
        },
        {
          text: "Share",
          class: "modal-btn-secondary",
          action: () => {
            hideModal();
            shareGame();
          },
        },
      ],
    );
  }

  function handleGameOver() {
    gameOver = true;
    stopTimer();
    showModal("Game Over", `You made ${maxMistakes} mistakes. Better luck next time!`, [
      {
        text: "Try Again",
        class: "modal-btn-primary",
        action: () => {
          hideModal();
          newGame();
        },
      },
      { text: "Close", class: "modal-btn-secondary", action: hideModal },
    ]);
  }

  // Modal
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

  // Save / Load
  function saveGame() {
    const saveData = {
      puzzle: puzzle,
      solution: solution,
      board: board,
      notes: notes.map((row) => row.map((set) => [...set])),
      difficulty: difficulty,
      mistakes: mistakes,
      hintsRemaining: hintsRemaining,
      timerSeconds: timerSeconds,
      gameOver: gameOver,
    };
    localStorage.setItem("sudoku_save", JSON.stringify(saveData));
    showModal("Game Saved", "Your progress has been saved. You can resume anytime.", [
      { text: "OK", class: "modal-btn-primary", action: hideModal },
    ]);
  }

  function loadGame() {
    const raw = localStorage.getItem("sudoku_save");
    if (!raw) {
      showModal("No Saved Game", "There is no saved game to resume.", [
        { text: "OK", class: "modal-btn-primary", action: hideModal },
      ]);
      return;
    }

    try {
      const data = JSON.parse(raw);
      puzzle = data.puzzle;
      solution = data.solution;
      board = data.board;
      notes = data.notes.map((row) => row.map((arr) => new Set(arr)));
      difficulty = data.difficulty;
      mistakes = data.mistakes;
      hintsRemaining = data.hintsRemaining;
      timerSeconds = data.timerSeconds;
      gameOver = data.gameOver;

      setActiveDifficulty(difficulty);
      updateMistakes();
      updateHintCount();
      history = [];
      selectedCell = null;
      notesMode = false;
      document.getElementById("btn-notes").classList.remove("active");
      renderBoard();
      if (!gameOver) startTimer();
      else timerEl.textContent = formatTime(timerSeconds);

      showModal("Game Resumed", `Your ${difficulty} game has been loaded.`, [
        { text: "OK", class: "modal-btn-primary", action: hideModal },
      ]);
    } catch {
      showModal("Error", "Could not load saved game. The save data may be corrupted.", [
        { text: "OK", class: "modal-btn-primary", action: hideModal },
      ]);
    }
  }

  // Share
  function shareGame() {
    const encoded = Sudoku.encode(puzzle, solution, difficulty);
    const url = `${window.location.origin}${window.location.pathname}?puzzle=${encoded}`;

    const overlay = document.getElementById("modal-overlay");
    const content = document.getElementById("modal-content");
    const actions = document.getElementById("modal-actions");

    content.innerHTML = `
            <h2>Share Puzzle</h2>
            <p>Share this ${difficulty} puzzle with friends:</p>
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
          // Fallback
          document.execCommand("copy");
          document.getElementById("copy-btn").textContent = "Copied!";
        });
    });

    document.getElementById("share-close").addEventListener("click", hideModal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) hideModal();
    });
  }

  return { init };
})();

// Start the game
document.addEventListener("DOMContentLoaded", Game.init);
