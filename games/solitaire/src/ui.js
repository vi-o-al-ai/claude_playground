/**
 * Solitaire UI controller.
 * Wires DOM events, drag-and-drop, and timer to engine functions.
 */
import {
  SUIT_COLORS,
  createInitialState,
  getCards,
  attemptMove,
  findAutoMove,
  clickStock,
  checkWin,
} from "./engine.js";
import { GameHeader, GameOver } from "@arcade/shared-ui";

let state = {};
let moveCount = 0;
let timerStart = null;
let timerInterval = null;
let dragInfo = null;

const gameOverOverlay = new GameOver();

// Add shared GameHeader
new GameHeader({
  title: "Solitaire",
  container: document.getElementById("app"),
});

// ---- Game lifecycle ----

window.newGame = function () {
  clearInterval(timerInterval);
  moveCount = 0;
  document.getElementById("move-count").textContent = "0";
  document.getElementById("timer").textContent = "0:00";
  gameOverOverlay.hide();

  state = createInitialState();

  timerStart = Date.now();
  timerInterval = setInterval(updateTimer, 1000);

  render();
};

function updateTimer() {
  const elapsed = Math.floor((Date.now() - timerStart) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  document.getElementById("timer").textContent = `${m}:${s.toString().padStart(2, "0")}`;
}

function incMoves() {
  moveCount++;
  document.getElementById("move-count").textContent = moveCount;
}

function handleWin() {
  clearInterval(timerInterval);
  const elapsed = Math.floor((Date.now() - timerStart) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  const timeStr = `${m}:${s.toString().padStart(2, "0")}`;

  setTimeout(
    () =>
      gameOverOverlay.show({
        title: "You Win!",
        stats: [
          { label: "Moves", value: String(moveCount) },
          { label: "Time", value: timeStr },
        ],
        onRestart: () => window.newGame(),
        restartLabel: "Play Again",
      }),
    400,
  );
}

// ---- Render ----

function render() {
  renderStock();
  renderWaste();
  renderFoundations();
  renderTableau();
}

function makeCardEl(card, extraClass = "") {
  const el = document.createElement("div");
  el.className = `card ${card.faceUp ? "face-up" : "face-down"} ${card.faceUp ? SUIT_COLORS[card.suit] : ""} ${extraClass}`;
  el.dataset.id = card.id;

  if (card.faceUp) {
    el.innerHTML = `
      <div class="top-label">${card.rank}<br>${card.suit}</div>
      <div class="suit-center">${card.suit}</div>
      <div class="bottom-label">${card.rank}<br>${card.suit}</div>
    `;
  }

  return el;
}

function renderStock() {
  const el = document.getElementById("stock");
  el.innerHTML = "";
  el.classList.toggle("empty", state.stock.length === 0);

  if (state.stock.length > 0) {
    const card = makeCardEl({ suit: "?", rank: "?", faceUp: false, id: "__stock__" });
    el.appendChild(card);
  }

  el.onclick = () => {
    clickStock(state);
    incMoves();
    render();
  };
}

function renderWaste() {
  const el = document.getElementById("waste");
  el.innerHTML = "";
  if (state.waste.length > 0) {
    const card = state.waste[state.waste.length - 1];
    const cardEl = makeCardEl(card);
    addDragSource(cardEl, "waste", null, 0);
    addDoubleClick(cardEl, () => doAutoMove("waste", null, 0));
    el.appendChild(cardEl);
  }
}

function renderFoundations() {
  const suits = ["♠", "♥", "♦", "♣"];
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById(`f${i}`);
    el.innerHTML = "";
    const pile = state.foundations[i];

    if (pile.length === 0) {
      el.innerHTML = `<span style="color:rgba(255,255,255,0.3);font-size:1.5rem;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)">${suits[i]}</span>`;
    } else {
      const card = pile[pile.length - 1];
      const cardEl = makeCardEl(card);
      el.appendChild(cardEl);
    }

    addDropTarget(el, "foundation", i);
  }
}

function renderTableau() {
  for (let col = 0; col < 7; col++) {
    const el = document.getElementById(`t${col}`);
    el.innerHTML = "";
    const pile = state.tableau[col];
    const FACE_DOWN_GAP = 20;
    const FACE_UP_GAP = 28;

    let top = 0;
    pile.forEach((card, row) => {
      const cardEl = makeCardEl(card);
      cardEl.style.top = top + "px";

      if (card.faceUp) {
        addDragSource(cardEl, "tableau", col, row);
        addDoubleClick(cardEl, () => {
          if (row === pile.length - 1) doAutoMove("tableau", col, row);
        });
        top += FACE_UP_GAP;
      } else {
        top += FACE_DOWN_GAP;
        if (row === pile.length - 1) {
          cardEl.style.cursor = "pointer";
          cardEl.onclick = () => {
            card.faceUp = true;
            incMoves();
            render();
          };
        }
      }

      el.appendChild(cardEl);
    });

    el.style.minHeight = top + 140 + "px";
    addDropTarget(el, "tableau", col);
  }
}

// ---- Drag & Drop ----

function addDragSource(cardEl, pileType, pileIdx, cardIdx) {
  cardEl.draggable = true;
  cardEl.addEventListener("dragstart", (e) => {
    dragInfo = { pileType, pileIdx, cardIdx };
    setTimeout(() => cardEl.classList.add("dragging"), 0);
    e.dataTransfer.effectAllowed = "move";
  });
  cardEl.addEventListener("dragend", () => {
    cardEl.classList.remove("dragging");
    dragInfo = null;
    document.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
  });
}

function addDropTarget(el, targetType, targetIdx) {
  el.addEventListener("dragover", (e) => {
    e.preventDefault();
    el.classList.add("drag-over");
  });
  el.addEventListener("dragleave", () => el.classList.remove("drag-over"));
  el.addEventListener("drop", (e) => {
    e.preventDefault();
    el.classList.remove("drag-over");
    if (!dragInfo) return;
    doMove(dragInfo.pileType, dragInfo.pileIdx, dragInfo.cardIdx, targetType, targetIdx);
  });
}

function addDoubleClick(cardEl, fn) {
  cardEl.addEventListener("dblclick", fn);
}

// ---- Move helpers ----

function doMove(fromType, fromIdx, fromCardIdx, toType, toIdx) {
  const result = attemptMove(state, fromType, fromIdx, fromCardIdx, toType, toIdx);
  if (!result.success) return false;
  incMoves();
  render();
  if (checkWin(state)) handleWin();
  return true;
}

function doAutoMove(fromType, fromIdx, fromCardIdx) {
  const cards = getCards(state, fromType, fromIdx, fromCardIdx);
  if (cards.length !== 1) return;
  const dest = findAutoMove(state, fromType, fromIdx, fromCardIdx);
  if (dest) doMove(fromType, fromIdx, fromCardIdx, dest.toType, dest.toIdx);
}

// Start!
window.newGame();
