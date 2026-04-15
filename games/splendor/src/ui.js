/**
 * Splendor UI controller / glue code.
 * Wires DOM events to the SplendorGame engine and SplendorNetwork layer.
 */
import { GEM_COLORS, GEM_HEX, SplendorGame } from "./engine.js";
import { SplendorNetwork } from "./network.js";
import { AssetStore } from "./asset-store.js";
import { initArtCustomizer } from "./asset-ui.js";
import { GameHeader, GameOver } from "@arcade/shared-ui";

const gameOverOverlay = new GameOver();
let gameHeader = null;

// Custom-art asset store (local library + optional online overlay bundle).
// Art mappings are stored in IndexedDB per browser profile and are local to
// each player by default. When a host starts an online game, their bundle is
// broadcast and loaded via applyOverlayBundle() on every client.
const assetStore = new AssetStore();
const DEFAULT_BODY_BACKGROUND = "linear-gradient(135deg, #0f0c29, #302b63, #24243e)";
const assetStoreReady = assetStore.init().then(() => {
  applyBodyBackground();
});
assetStore.onChange(() => {
  applyBodyBackground();
  if (game) renderGame();
});
initArtCustomizer(assetStore);
// Expose for the lobby button (inline onclick in index.html).
window.showArtCustomizer = () => window._showArtCustomizer?.();

let game = null;
let network = null;
let isOnline = false;
let isHost = false;
let myPlayerIndex = 0;
let actionMode = null;
let selectedGems = [];
let selectedCard = null;
let gemsToReturn = {};
let peerPlayerMap = {};
let playerNames = [];
let expectedPlayers = 2;

// ---- Lobby ----

window.updateLocalPlayerInputs = function () {
  const count = parseInt(document.getElementById("local-player-count").value);
  const container = document.getElementById("local-player-inputs");
  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const row = document.createElement("div");
    row.className = "local-player-row";
    row.innerHTML = `<input type="text" placeholder="Player ${i + 1}" id="local-name-${i}" value="Player ${i + 1}">`;
    container.appendChild(row);
  }
};

window.startLocalGame = async function () {
  const count = parseInt(document.getElementById("local-player-count").value);
  const names = [];
  for (let i = 0; i < count; i++) {
    const input = document.getElementById(`local-name-${i}`);
    names.push(input ? input.value.trim() || `Player ${i + 1}` : `Player ${i + 1}`);
  }
  isOnline = false;
  isHost = true;
  myPlayerIndex = 0;
  game = new SplendorGame(count, names);
  await showGameScreen();
  renderGame();
};

window.createRoom = async function () {
  const name = document.getElementById("host-name").value.trim() || "Host";
  expectedPlayers = parseInt(document.getElementById("host-player-count").value);
  network = new SplendorNetwork();
  try {
    const code = await network.createRoom(name);
    isOnline = true;
    isHost = true;
    myPlayerIndex = 0;
    playerNames = [name];
    peerPlayerMap = {};

    document.getElementById("room-info").style.display = "block";
    document.getElementById("room-host-info").style.display = "block";
    document.getElementById("room-client-info").style.display = "none";
    document.getElementById("room-code-display").textContent = code;
    document.getElementById("chat-btn").style.display = "inline-block";
    updatePlayerList();

    network.onPlayerJoined((pName, peerId) => {
      if (playerNames.length < expectedPlayers) {
        playerNames.push(pName);
        peerPlayerMap[peerId] = playerNames.length - 1;
        updatePlayerList();
      }
    });
    network.onPlayerLeft((_peerId) => {
      logMsg(`A player disconnected`);
    });
    network.onActionReceived((action, peerId) => {
      handleRemoteAction(action, peerId);
    });
    network.onChatReceived((msg) => addChatMessage(msg));
    network.onError((err) => logMsg("Network error: " + err.message));
  } catch (e) {
    alert("Failed to create room: " + e.message);
  }
};

window.joinRoom = async function () {
  const name = document.getElementById("join-name").value.trim() || "Player";
  const code = document.getElementById("join-code").value.trim().toUpperCase();
  if (!code || code.length < 4) {
    alert("Enter a valid room code");
    return;
  }
  network = new SplendorNetwork();
  try {
    await network.joinRoom(code, name);
    isOnline = true;
    isHost = false;
    document.getElementById("room-info").style.display = "block";
    document.getElementById("room-host-info").style.display = "none";
    document.getElementById("room-client-info").style.display = "block";
    document.getElementById("room-code-display2").textContent = code;
    document.getElementById("chat-btn").style.display = "inline-block";

    const clientList = document.getElementById("player-list-client");
    network.onPlayerJoined((pName) => {
      const li = document.createElement("li");
      li.textContent = pName;
      clientList.appendChild(li);
    });
    network.onStateUpdate(async (state) => {
      if (state && state.type === "start_game") return;
      if (state && state.players) {
        if (!game) {
          game = new SplendorGame(
            state.players.length,
            state.players.map((p) => p.name),
          );
          for (let i = 0; i < state.players.length; i++) {
            if (state.players[i].name === name) {
              myPlayerIndex = i;
              break;
            }
          }
          await showGameScreen();
        }
        game.loadState(state);
        renderGame();
      }
    });
    network.onChatReceived((msg) => addChatMessage(msg));
    network.onError((err) => logMsg("Network error: " + err.message));
  } catch (e) {
    alert("Failed to join room: " + e.message);
  }
};

function updatePlayerList() {
  const ul = document.getElementById("player-list");
  ul.innerHTML = "";
  playerNames.forEach((n, i) => {
    const li = document.createElement("li");
    li.textContent = (i === 0 ? "👑 " : "") + n;
    ul.appendChild(li);
  });
  const btn = document.getElementById("start-game-btn");
  btn.disabled = playerNames.length < 2;
}

window.startOnlineGame = async function () {
  if (playerNames.length < 2) return;
  game = new SplendorGame(playerNames.length, playerNames);
  network.startGame();
  network.broadcastState(game.getState());
  // Host also shares its local art bundle so every client sees the same
  // visuals. Clients apply it as a read-only overlay that does not touch
  // their own saved library.
  try {
    const bundle = await assetStore.exportBundle();
    if (bundle.assets.length > 0 || Object.keys(bundle.mapping).length > 0) {
      network.broadcastArtBundle(bundle);
    }
  } catch (err) {
    console.warn("Failed to broadcast art bundle:", err);
  }
  await showGameScreen();
  renderGame();
};

window.copyRoomCode = function () {
  const code = document.getElementById("room-code-display").textContent;
  navigator.clipboard.writeText(code).catch(() => {});
};

async function showGameScreen() {
  // Ensure the asset store is hydrated so the first render already applies
  // any custom art instead of flashing the default theme.
  await assetStoreReady;

  document.getElementById("lobby-screen").style.display = "none";
  document.getElementById("game-screen").style.display = "block";

  if (!gameHeader) {
    gameHeader = new GameHeader({
      title: "Splendor",
      container: document.getElementById("game-screen"),
    });
  }

  applyBodyBackground();

  if (isOnline && network) {
    document.getElementById("game-room-code").textContent = "Room: " + (network.roomCode || "");
  }
}

function applyBodyBackground() {
  const url = assetStore.getUrlForPiece("bg:body");
  if (url) {
    document.body.style.background = `url(${url}) center/cover no-repeat fixed, ${DEFAULT_BODY_BACKGROUND}`;
  } else {
    document.body.style.background = DEFAULT_BODY_BACKGROUND;
  }
}

// ---- Rendering ----

function renderGame() {
  if (!game || !game.state) return;
  const st = game.state;

  const cp = st.players[st.currentPlayerIndex];
  const isMyTurn = !isOnline || st.currentPlayerIndex === myPlayerIndex;
  document.getElementById("turn-info").textContent = st.gameOver
    ? "Game Over!"
    : isMyTurn
      ? `Your turn (${cp.name})`
      : `${cp.name}'s turn`;

  renderNobles(st);
  renderBank(st);
  renderTiers(st);
  renderPlayers(st);
  renderReserved(st);
  renderActionBar(st, isMyTurn);

  if (st.gameOver) showGameOver();
}

function renderNobles(st) {
  const row = document.getElementById("nobles-row");
  row.innerHTML = '<strong style="margin-right:8px;color:#FFD700;">Nobles</strong>';
  st.nobles.forEach((noble) => {
    const tile = document.createElement("div");
    tile.className = "noble-tile";
    applyCustomArt(tile, noble.id);
    tile.innerHTML = `<span class="noble-pts">${noble.points}</span><div class="noble-reqs">${GEM_COLORS.filter(
      (c) => noble.requires[c],
    )
      .map(
        (c) =>
          `<span class="noble-req"><span class="cost-gem gem-${c}"></span>${noble.requires[c]}</span>`,
      )
      .join("")}</div>`;
    row.appendChild(tile);
  });
}

/**
 * If the given piece has a mapped custom image, apply it as a background image
 * and tag the element so CSS can lay the default HUD on top with a legibility
 * gradient. Returns true if custom art was applied.
 */
function applyCustomArt(el, pieceId) {
  if (!pieceId) return false;
  const url = assetStore.getUrlForPiece(pieceId);
  if (!url) return false;
  el.classList.add("has-custom-art");
  el.style.backgroundImage = `url("${url}")`;
  if (assetStore.getHideHudForPiece(pieceId)) {
    el.classList.add("hide-hud");
  }
  return true;
}

function renderBank(st) {
  const bank = document.getElementById("token-bank");
  bank.innerHTML = "";
  [...GEM_COLORS, "gold"].forEach((color) => {
    const tok = document.createElement("div");
    tok.className = `bank-token gem-${color}`;
    applyCustomArt(tok, `gem:${color}`);
    if (
      selectedGems.includes(color) ||
      (selectedGems.length === 2 && selectedGems[0] === color && selectedGems[1] === color)
    ) {
      const selCount = selectedGems.filter((c) => c === color).length;
      if (selCount > 0) tok.classList.add("selected");
    }
    tok.innerHTML = `<span class="token-count">${st.bank[color]}</span><span class="token-label">${color}</span>`;
    if (color !== "gold") {
      tok.onclick = () => onBankTokenClick(color, st);
    }
    bank.appendChild(tok);
  });
}

function renderTiers(st) {
  for (let t = 2; t >= 0; t--) {
    const tier = st.tiers[t];
    const container = document.getElementById(`tier-${t + 1}`);
    container.innerHTML = "";
    const deck = document.createElement("div");
    deck.className = "deck-indicator";
    deck.style.borderColor =
      t === 2 ? "rgba(33,150,243,0.4)" : t === 1 ? "rgba(255,215,0,0.4)" : "rgba(76,175,80,0.4)";
    applyCustomArt(deck, `deck:t${t + 1}`);
    deck.innerHTML = `<span class="deck-count">${tier.deck.length}</span><span>Tier ${t + 1}</span>`;
    deck.onclick = () => onDeckClick(t + 1);
    container.appendChild(deck);

    const cardsDiv = document.createElement("div");
    cardsDiv.className = "tier-cards";
    for (let i = 0; i < 4; i++) {
      const card = tier.visible[i];
      if (card) {
        const cardEl = renderCard(card, () => onCardClick(t + 1, i, card));
        if (selectedCard && selectedCard.tier === t + 1 && selectedCard.index === i) {
          cardEl.classList.add("highlight");
        }
        cardsDiv.appendChild(cardEl);
      } else {
        const empty = document.createElement("div");
        empty.className = "game-card empty-slot";
        cardsDiv.appendChild(empty);
      }
    }
    container.appendChild(cardsDiv);
  }
}

function renderCard(card, onClick) {
  const div = document.createElement("div");
  div.className = `game-card card-bg-${card.bonus}`;
  applyCustomArt(div, card.id);
  const pts = card.points > 0 ? card.points : "";
  const costHtml = GEM_COLORS.filter((c) => card.cost[c])
    .map(
      (c) => `<div class="cost-item"><span class="cost-gem gem-${c}"></span>${card.cost[c]}</div>`,
    )
    .join("");
  div.innerHTML = `
    <div class="card-header">
      <span class="card-points">${pts}</span>
      <span class="card-bonus gem-${card.bonus}" style="background:${GEM_HEX[card.bonus]}"></span>
    </div>
    <div class="card-cost">${costHtml}</div>`;
  if (onClick) div.onclick = onClick;
  return div;
}

function renderPlayers(st) {
  const panel = document.getElementById("players-panel");
  panel.innerHTML = "";
  st.players.forEach((p, i) => {
    const div = document.createElement("div");
    div.className = "player-card";
    if (i === st.currentPlayerIndex) div.classList.add("active-player");
    if (i === myPlayerIndex) div.classList.add("current-user");

    const bonuses = game.getPlayerBonuses(p);
    const pts = game._getPlayerPoints(p);

    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span class="player-name">${i === myPlayerIndex ? "⭐ " : ""}${p.name}</span>
        <span class="player-points">${pts} pts</span>
      </div>
      <div class="player-gems">${[...GEM_COLORS, "gold"]
        .map((c) => `<span class="player-gem gem-${c}">${p.gems[c]}</span>`)
        .join("")}</div>
      <div class="player-bonuses">${GEM_COLORS.map(
        (c) =>
          `<span class="player-bonus" style="background:${GEM_HEX[c]}33;color:${GEM_HEX[c]}">${bonuses[c] || 0}</span>`,
      ).join("")}</div>
      ${p.reserved.length > 0 ? `<div class="player-reserved-count">${p.reserved.length} reserved card(s)</div>` : ""}
      ${p.nobles.length > 0 ? `<div style="font-size:0.8rem;color:#FFD700;margin-top:4px;">${p.nobles.length} noble(s)</div>` : ""}
    `;
    panel.appendChild(div);
  });
}

function renderReserved(st) {
  const me = st.players[myPlayerIndex];
  const area = document.getElementById("reserved-area");
  const container = document.getElementById("reserved-cards");
  if (!me || me.reserved.length === 0) {
    area.style.display = "none";
    return;
  }
  area.style.display = "block";
  container.innerHTML = "";
  me.reserved.forEach((card, i) => {
    const cardEl = renderCard(card, () => onReservedClick(i, card));
    if (selectedCard && selectedCard.reserved === i) {
      cardEl.classList.add("highlight");
    }
    container.appendChild(cardEl);
  });
}

function renderActionBar(st, isMyTurn) {
  const modeLabel = document.getElementById("action-mode");
  const confirmBtn = document.getElementById("btn-confirm");
  const cancelBtn = document.getElementById("btn-cancel");

  if (st.gameOver) {
    modeLabel.textContent = "Game Over!";
    confirmBtn.style.display = "none";
    cancelBtn.style.display = "none";
    return;
  }

  if (st.turnPhase === "return_gems") {
    showGemReturnOverlay(game._totalPlayerGems(st.players[st.currentPlayerIndex]) - 10);
    return;
  }
  if (st.turnPhase === "choose_noble") {
    const eligible = game.checkNobles(st.players[st.currentPlayerIndex]);
    showNobleChoiceOverlay(eligible);
    return;
  }

  if (!isMyTurn) {
    modeLabel.textContent = `Waiting for ${st.players[st.currentPlayerIndex].name}...`;
    confirmBtn.style.display = "none";
    cancelBtn.style.display = "none";
    return;
  }

  if (actionMode === "take_gems") {
    modeLabel.textContent = `Taking gems: ${selectedGems.length}/3 selected`;
    confirmBtn.style.display = "inline-block";
    confirmBtn.disabled = selectedGems.length === 0;
    cancelBtn.style.display = "inline-block";
  } else if (selectedCard) {
    const label =
      selectedCard.reserved !== undefined ? "reserved card" : `Tier ${selectedCard.tier} card`;
    modeLabel.textContent = `Selected: ${label}`;
    confirmBtn.style.display = "none";
    cancelBtn.style.display = "inline-block";
  } else {
    modeLabel.textContent = "Click gems to take, or click a card to buy/reserve";
    confirmBtn.style.display = "none";
    cancelBtn.style.display = "none";
  }
}

// ---- Interactions ----

function onBankTokenClick(color, st) {
  if (game.state.turnPhase !== "action") return;
  if (isOnline && game.state.currentPlayerIndex !== myPlayerIndex) return;

  actionMode = "take_gems";

  if (selectedGems.length === 1 && selectedGems[0] === color && st.bank[color] >= 4) {
    selectedGems.push(color);
  } else if (selectedGems.length === 2 && selectedGems[0] === selectedGems[1]) {
    return;
  } else if (selectedGems.includes(color)) {
    selectedGems = selectedGems.filter((c) => c !== color);
    if (selectedGems.length === 0) actionMode = null;
  } else if (
    selectedGems.length < 3 &&
    !(
      selectedGems.length > 0 &&
      selectedGems[0] === selectedGems[selectedGems.length - 1] &&
      selectedGems.length === 2
    )
  ) {
    if (selectedGems.length === 2 && selectedGems[0] === selectedGems[1]) return;
    selectedGems.push(color);
  }

  renderGame();
}

function onCardClick(tier, index, card) {
  if (game.state.turnPhase !== "action") return;
  if (isOnline && game.state.currentPlayerIndex !== myPlayerIndex) return;
  cancelAction();

  const me = game.state.players[isOnline ? myPlayerIndex : game.state.currentPlayerIndex];
  const affordable = game.canAfford(me, card);

  selectedCard = { tier, index };

  const bar = document.getElementById("action-bar");
  const modeLabel = document.getElementById("action-mode");
  modeLabel.textContent = `Tier ${tier} card selected`;

  document.querySelectorAll(".dynamic-action-btn").forEach((b) => b.remove());

  if (affordable) {
    const buyBtn = document.createElement("button");
    buyBtn.className = "primary dynamic-action-btn";
    buyBtn.textContent = "Buy Card";
    buyBtn.onclick = () => executeAction({ type: "buy_card", cardLocation: { tier, index } });
    bar.appendChild(buyBtn);
  }

  if (me.reserved.length < 3) {
    const resBtn = document.createElement("button");
    resBtn.className = "dynamic-action-btn";
    resBtn.textContent = "Reserve Card";
    resBtn.onclick = () => executeAction({ type: "reserve_card", tier, index });
    bar.appendChild(resBtn);
  }

  document.getElementById("btn-cancel").style.display = "inline-block";
  renderGame();
}

function onReservedClick(index, card) {
  if (game.state.turnPhase !== "action") return;
  if (isOnline && game.state.currentPlayerIndex !== myPlayerIndex) return;
  cancelAction();

  const me = game.state.players[isOnline ? myPlayerIndex : game.state.currentPlayerIndex];
  const affordable = game.canAfford(me, card);

  selectedCard = { reserved: index };

  const bar = document.getElementById("action-bar");
  document.querySelectorAll(".dynamic-action-btn").forEach((b) => b.remove());

  if (affordable) {
    const buyBtn = document.createElement("button");
    buyBtn.className = "primary dynamic-action-btn";
    buyBtn.textContent = "Buy Reserved";
    buyBtn.onclick = () => executeAction({ type: "buy_card", cardLocation: { reserved: index } });
    bar.appendChild(buyBtn);
  }

  document.getElementById("btn-cancel").style.display = "inline-block";
  renderGame();
}

function onDeckClick(tier) {
  if (game.state.turnPhase !== "action") return;
  if (isOnline && game.state.currentPlayerIndex !== myPlayerIndex) return;
  const me = game.state.players[isOnline ? myPlayerIndex : game.state.currentPlayerIndex];
  if (me.reserved.length >= 3) {
    logMsg("Cannot reserve: already have 3 reserved cards");
    return;
  }
  if (game.state.tiers[tier - 1].deck.length === 0) {
    logMsg("Deck is empty");
    return;
  }
  executeAction({ type: "reserve_card", tier, index: null });
}

window.confirmAction = function () {
  if (actionMode === "take_gems" && selectedGems.length > 0) {
    executeAction({ type: "take_gems", colors: [...selectedGems] });
  }
};

function cancelAction() {
  actionMode = null;
  selectedGems = [];
  selectedCard = null;
  document.querySelectorAll(".dynamic-action-btn").forEach((b) => b.remove());
  renderGame();
}
window.cancelAction = cancelAction;

// ---- Action Execution ----

function executeAction(action) {
  if (isOnline && !isHost) {
    network.sendAction(action);
    window.cancelAction();
    return;
  }

  let result;
  switch (action.type) {
    case "take_gems":
      result = game.takeGems(action.colors);
      break;
    case "buy_card":
      result = game.buyCard(action.cardLocation);
      break;
    case "reserve_card":
      result = game.reserveCard(action.tier, action.index);
      break;
    default:
      logMsg("Unknown action: " + action.type);
      return;
  }

  if (!result.success) {
    logMsg(result.error);
  } else {
    if (action.type === "take_gems") logMsg(`Took gems: ${action.colors.join(", ")}`);
    else if (action.type === "buy_card") logMsg(`Bought a card`);
    else if (action.type === "reserve_card") logMsg(`Reserved a card`);
  }

  actionMode = null;
  selectedGems = [];
  selectedCard = null;
  document.querySelectorAll(".dynamic-action-btn").forEach((b) => b.remove());

  if (isOnline && isHost) {
    network.broadcastState(game.getState());
  }
  renderGame();
}

function handleRemoteAction(action, peerId) {
  if (!isHost || !game) return;
  const playerIdx = peerPlayerMap[peerId];
  if (playerIdx === undefined) return;
  if (playerIdx !== game.state.currentPlayerIndex) {
    logMsg("Not your turn!");
    return;
  }
  executeAction(action);
}

// ---- Overlays ----

function showGemReturnOverlay(count) {
  if (isOnline && game.state.currentPlayerIndex !== myPlayerIndex) return;
  const overlay = document.getElementById("gem-return-overlay");
  overlay.classList.add("active");
  document.getElementById("gem-return-msg").textContent =
    `You have too many gems. Return ${count} gem(s).`;
  gemsToReturn = {};

  const selector = document.getElementById("gem-return-selector");
  selector.innerHTML = "";
  const me = game.state.players[game.state.currentPlayerIndex];

  [...GEM_COLORS, "gold"].forEach((color) => {
    if (me.gems[color] <= 0) return;
    const btn = document.createElement("div");
    btn.className = `gem-select-btn gem-${color}`;
    btn.innerHTML = `<span>${me.gems[color]}</span><span style="font-size:0.6rem">${color}</span>`;
    btn.dataset.color = color;
    btn.dataset.count = 0;
    btn.onclick = () => {
      let current = parseInt(btn.dataset.count);
      if (current < me.gems[color]) {
        const totalReturning = Object.values(gemsToReturn).reduce((a, b) => a + b, 0);
        if (totalReturning < count) {
          current++;
          btn.dataset.count = current;
          gemsToReturn[color] = current;
          if (current > 0) btn.classList.add("selected");
          btn.innerHTML = `<span>${current}/${me.gems[color]}</span><span style="font-size:0.6rem">${color}</span>`;
        }
      } else {
        btn.dataset.count = 0;
        delete gemsToReturn[color];
        btn.classList.remove("selected");
        btn.innerHTML = `<span>${me.gems[color]}</span><span style="font-size:0.6rem">${color}</span>`;
      }
    };
    selector.appendChild(btn);
  });
}

window.confirmGemReturn = function () {
  const result = game.returnGems(gemsToReturn);
  if (!result.success) {
    logMsg(result.error);
    return;
  }
  document.getElementById("gem-return-overlay").classList.remove("active");
  gemsToReturn = {};
  if (isOnline && isHost) network.broadcastState(game.getState());
  renderGame();
};

function showNobleChoiceOverlay(eligibleNobles) {
  if (isOnline && game.state.currentPlayerIndex !== myPlayerIndex) return;
  const overlay = document.getElementById("noble-choice-overlay");
  overlay.classList.add("active");
  const selector = document.getElementById("noble-selector");
  selector.innerHTML = "";
  eligibleNobles.forEach(({ noble, index }) => {
    const tile = document.createElement("div");
    tile.className = "noble-tile";
    tile.style.cursor = "pointer";
    tile.innerHTML = `<span class="noble-pts">${noble.points}</span><div class="noble-reqs">${GEM_COLORS.filter(
      (c) => noble.requires[c],
    )
      .map(
        (c) =>
          `<span class="noble-req"><span class="cost-gem gem-${c}"></span>${noble.requires[c]}</span>`,
      )
      .join("")}</div>`;
    tile.onclick = () => {
      const res = game.chooseNoble(index);
      if (res.success) {
        overlay.classList.remove("active");
        if (isOnline && isHost) network.broadcastState(game.getState());
        renderGame();
      }
    };
    selector.appendChild(tile);
  });
}

function showGameOver() {
  const winner = game.state.winner || game.getWinner();
  const stats = game.state.players.map((p) => ({
    label: p.name,
    value: `${game._getPlayerPoints(p)} pts`,
  }));

  gameOverOverlay.show({
    title: `${winner.name} Wins!`,
    stats,
    onRestart: () => location.reload(),
    restartLabel: "Play Again",
  });
}

// ---- Chat ----

window.showChat = function () {
  document.getElementById("chat-panel").classList.add("open");
};
window.hideChat = function () {
  document.getElementById("chat-panel").classList.remove("open");
};
window.sendChatMsg = function () {
  const input = document.getElementById("chat-input");
  const msg = input.value.trim();
  if (!msg || !network) return;
  network.sendChat(msg, network.playerName);
  addChatMessage({ message: msg, playerName: network.playerName, timestamp: Date.now() });
  input.value = "";
};

function addChatMessage(data) {
  const container = document.getElementById("chat-messages");
  const div = document.createElement("div");
  div.className = "chat-msg";
  div.innerHTML = `<span class="chat-author">${data.playerName}:</span> <span class="chat-text">${data.message}</span>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// ---- Logging ----

function logMsg(msg) {
  const log = document.getElementById("game-log");
  log.textContent = msg;
  log.style.maxHeight = "48px";
  setTimeout(() => {
    log.style.maxHeight = "24px";
  }, 3000);
}

// ---- Init ----
window.updateLocalPlayerInputs();
