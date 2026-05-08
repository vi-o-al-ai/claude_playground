import { GameHeader } from "@arcade/shared-ui";
import {
  createGame,
  selectCard,
  revealClue,
  submitGuess,
  coverAnswer,
  VERIFICATION_STRICT,
  VERIFICATION_FAITHFUL,
} from "./engine.js";
import { DECK } from "./deck.js";

const app = document.getElementById("app");

let playerCount = 2;
let verificationMode = VERIFICATION_STRICT;
let game = createGame({ deck: DECK, playerCount, verificationMode });
let view = "setup";

new GameHeader({ title: "In a Nutshell", container: app });

function rebuildGame() {
  const completed = game.completed;
  game = createGame({ deck: DECK, playerCount, verificationMode });
  game.completed = completed;
  render();
}

function startCard(cardId) {
  game = selectCard(game, cardId);
  view = "round";
  render();
}

function onReveal(index) {
  game = revealClue(game, index);
  render();
}

function onGuess(text) {
  if (!text.trim()) return;
  game = submitGuess(game, text);
  render();
}

function onCover() {
  game = coverAnswer(game);
  render();
}

function backToSetup() {
  view = "setup";
  render();
}

function render() {
  for (const node of [...app.querySelectorAll(".screen")]) node.remove();
  if (view === "setup") app.appendChild(renderSetup());
  else app.appendChild(renderRound());
}

function renderSetup() {
  const screen = document.createElement("section");
  screen.className = "screen";

  const heading = document.createElement("h2");
  heading.textContent = "New round";
  screen.appendChild(heading);

  const helper = document.createElement("p");
  helper.className = "helper";
  helper.textContent =
    "Pick a card. On each turn a player either reveals one clue word or types a guess. First correct guess wins the card.";
  screen.appendChild(helper);

  // Player count
  const playerField = document.createElement("label");
  playerField.className = "field";
  playerField.innerHTML = "<span>Players</span>";
  const playerInput = document.createElement("input");
  playerInput.type = "number";
  playerInput.min = "2";
  playerInput.max = "12";
  playerInput.value = String(playerCount);
  playerInput.addEventListener("change", () => {
    const value = parseInt(playerInput.value, 10);
    if (Number.isInteger(value) && value >= 2 && value <= 12) {
      playerCount = value;
      rebuildGame();
    } else {
      playerInput.value = String(playerCount);
    }
  });
  playerField.appendChild(playerInput);
  screen.appendChild(playerField);

  // Verification mode toggle
  const modeRow = document.createElement("div");
  modeRow.className = "toggle-row";
  const modeBox = document.createElement("input");
  modeBox.type = "checkbox";
  modeBox.id = "faithful-mode";
  modeBox.checked = verificationMode === VERIFICATION_FAITHFUL;
  modeBox.addEventListener("change", () => {
    verificationMode = modeBox.checked ? VERIFICATION_FAITHFUL : VERIFICATION_STRICT;
    rebuildGame();
  });
  const modeLabel = document.createElement("label");
  modeLabel.htmlFor = "faithful-mode";
  modeLabel.textContent = "Faithful mode (wrong guesser sees the answer, may re-hide it)";
  modeRow.append(modeBox, modeLabel);
  screen.appendChild(modeRow);

  // Card dropdown
  const cardField = document.createElement("label");
  cardField.className = "field";
  cardField.innerHTML = "<span>Card</span>";
  const select = document.createElement("select");
  DECK.forEach((card, idx) => {
    const opt = document.createElement("option");
    opt.value = card.id;
    const completed = game.completed.includes(card.id);
    opt.textContent = `Card ${idx + 1}${completed ? "  ✓ done" : ""}`;
    if (completed) opt.disabled = true;
    select.appendChild(opt);
  });
  // Default to first incomplete card
  const firstIncomplete = DECK.find((c) => !game.completed.includes(c.id));
  if (firstIncomplete) select.value = firstIncomplete.id;
  cardField.appendChild(select);
  screen.appendChild(cardField);

  const actions = document.createElement("div");
  actions.className = "row-actions";

  const startBtn = document.createElement("button");
  startBtn.textContent = "Start round";
  startBtn.disabled = !firstIncomplete;
  startBtn.addEventListener("click", () => startCard(select.value));
  actions.appendChild(startBtn);

  if (game.completed.length > 0) {
    const resetBtn = document.createElement("button");
    resetBtn.className = "secondary";
    resetBtn.textContent = "Reset deck progress";
    resetBtn.addEventListener("click", () => {
      game = createGame({ deck: DECK, playerCount, verificationMode });
      render();
    });
    actions.appendChild(resetBtn);
  }

  screen.appendChild(actions);

  if (game.completed.length === DECK.length) {
    const done = document.createElement("p");
    done.className = "helper";
    done.textContent = "You’ve played every card in the deck. Reset to play again.";
    screen.appendChild(done);
  }

  return screen;
}

function renderRound() {
  const screen = document.createElement("section");
  screen.className = "screen";

  const card = game.activeCard;
  const cardIndex = DECK.findIndex((c) => c.id === card.id);

  const meta = document.createElement("div");
  meta.className = "round-meta";
  const player = document.createElement("span");
  player.className = "player";
  player.textContent = card.solved
    ? `Player ${card.lastGuess.by + 1} wins!`
    : `Player ${game.currentPlayer + 1}’s turn`;
  const cardLabel = document.createElement("span");
  cardLabel.className = "card-label";
  cardLabel.textContent = `Card ${cardIndex + 1} of ${DECK.length}`;
  meta.append(player, cardLabel);
  screen.appendChild(meta);

  // Clue board
  const board = document.createElement("div");
  board.className = "board";
  for (let i = 0; i < card.clues.length; i++) {
    const row = document.createElement("div");
    row.className = "clue-row";
    row.dataset.index = String(i);

    const num = document.createElement("span");
    num.className = "clue-number";
    num.textContent = String(i + 1);
    row.appendChild(num);

    const pill = document.createElement("div");
    pill.className = "clue-pill";
    if (card.revealed[i]) {
      pill.textContent = card.clues[i];
    } else {
      pill.classList.add("hidden");
      if (!card.solved) {
        pill.addEventListener("click", () => onReveal(i));
      }
    }
    row.appendChild(pill);
    board.appendChild(row);
  }

  // Answer row
  const answerRow = document.createElement("div");
  answerRow.className = "answer-row";
  const ansLabel = document.createElement("span");
  ansLabel.className = "clue-number";
  ansLabel.textContent = "ANS";
  const ansPill = document.createElement("div");
  ansPill.className = "answer-pill";
  if (card.answerRevealed) {
    ansPill.textContent = card.answer;
    if (card.solved) ansPill.classList.add("correct");
  } else {
    ansPill.classList.add("hidden");
  }
  answerRow.append(ansLabel, ansPill);
  board.appendChild(answerRow);

  screen.appendChild(board);

  // Feedback from last guess
  if (card.lastGuess) {
    const fb = document.createElement("div");
    fb.className = "feedback " + (card.lastGuess.correct ? "right" : "wrong");
    if (card.lastGuess.correct) {
      fb.textContent = `“${card.lastGuess.text}” — correct!`;
    } else {
      fb.textContent = `“${card.lastGuess.text}” — not quite.`;
    }
    screen.appendChild(fb);
  }

  // Guess input (only when round is active)
  if (!card.solved) {
    const showCoverButton = game.verificationMode === VERIFICATION_FAITHFUL && card.answerRevealed;

    if (showCoverButton) {
      const coverRow = document.createElement("div");
      coverRow.className = "row-actions";
      const coverBtn = document.createElement("button");
      coverBtn.textContent = "Cover the answer and continue";
      coverBtn.addEventListener("click", onCover);
      coverRow.appendChild(coverBtn);
      screen.appendChild(coverRow);
    } else {
      const form = document.createElement("form");
      form.className = "guess-form";
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Type your guess…";
      input.autocomplete = "off";
      const submit = document.createElement("button");
      submit.type = "submit";
      submit.textContent = "Guess";
      form.append(input, submit);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const text = input.value;
        input.value = "";
        onGuess(text);
      });
      screen.appendChild(form);
      setTimeout(() => input.focus(), 0);
    }
  }

  // Footer actions
  const actions = document.createElement("div");
  actions.className = "row-actions";

  const back = document.createElement("button");
  back.className = "secondary";
  back.textContent = card.solved ? "Pick next card" : "Back to setup";
  back.addEventListener("click", backToSetup);
  actions.appendChild(back);

  screen.appendChild(actions);

  return screen;
}

render();
