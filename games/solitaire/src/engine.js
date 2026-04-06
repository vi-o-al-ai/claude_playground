/**
 * Solitaire game engine.
 * Pure logic — no DOM, no side effects. Fully testable.
 */

export const SUITS = ["♠", "♥", "♦", "♣"];
export const SUIT_COLORS = { "♠": "black", "♣": "black", "♥": "red", "♦": "red" };
export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
export const RANK_VAL = {};
RANKS.forEach((r, i) => (RANK_VAL[r] = i + 1));

/**
 * Create a standard 52-card deck.
 */
export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, faceUp: false, id: `${rank}${suit}` });
    }
  }
  return deck;
}

/**
 * Shuffle an array in place using Fisher-Yates. Returns the array.
 */
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Create the initial game state from a shuffled deck.
 */
export function createInitialState() {
  const deck = shuffle(createDeck());
  const state = {
    stock: [],
    waste: [],
    foundations: [[], [], [], []],
    tableau: [[], [], [], [], [], [], []],
  };

  let idx = 0;
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = deck[idx++];
      card.faceUp = row === col;
      state.tableau[col].push(card);
    }
  }

  while (idx < deck.length) {
    state.stock.push(deck[idx++]);
  }

  return state;
}

/**
 * Get cards that would be moved from a pile.
 */
export function getCards(state, pileType, pileIdx, cardIdx) {
  if (pileType === "waste") {
    return [state.waste[state.waste.length - 1]];
  } else if (pileType === "tableau") {
    return state.tableau[pileIdx].slice(cardIdx);
  } else if (pileType === "foundation") {
    const pile = state.foundations[pileIdx];
    return pile.length > 0 ? [pile[pile.length - 1]] : [];
  }
  return [];
}

/**
 * Remove cards from their source pile (mutates state).
 */
export function removeCards(state, pileType, pileIdx, cardIdx) {
  if (pileType === "waste") {
    state.waste.pop();
  } else if (pileType === "tableau") {
    state.tableau[pileIdx].splice(cardIdx);
  } else if (pileType === "foundation") {
    state.foundations[pileIdx].pop();
  }
}

/**
 * Check if a card can be placed on a foundation pile.
 */
export function canPlaceOnFoundation(state, card, fIdx) {
  const pile = state.foundations[fIdx];
  if (pile.length === 0) return card.rank === "A";
  const top = pile[pile.length - 1];
  return top.suit === card.suit && RANK_VAL[card.rank] === RANK_VAL[top.rank] + 1;
}

/**
 * Check if cards (starting with cards[0]) can be placed on a tableau column.
 */
export function canPlaceOnTableau(state, cards, col) {
  const pile = state.tableau[col];
  const card = cards[0];
  if (pile.length === 0) return card.rank === "K";
  const top = pile[pile.length - 1];
  if (!top.faceUp) return false;
  return (
    SUIT_COLORS[card.suit] !== SUIT_COLORS[top.suit] &&
    RANK_VAL[card.rank] === RANK_VAL[top.rank] - 1
  );
}

/**
 * Attempt to move cards from source to destination.
 * Returns { success: boolean } and mutates state on success.
 * Also flips the new top of source tableau if face-down.
 */
export function attemptMove(state, fromType, fromIdx, fromCardIdx, toType, toIdx) {
  const cards = getCards(state, fromType, fromIdx, fromCardIdx);
  if (cards.length === 0) return { success: false };

  let valid = false;

  if (toType === "foundation") {
    if (cards.length === 1 && canPlaceOnFoundation(state, cards[0], toIdx)) {
      valid = true;
    }
  } else if (toType === "tableau") {
    if (canPlaceOnTableau(state, cards, toIdx)) valid = true;
  }

  if (!valid) return { success: false };

  removeCards(state, fromType, fromIdx, fromCardIdx);
  cards.forEach((c) => {
    c.faceUp = true;
  });

  if (toType === "foundation") {
    state.foundations[toIdx].push(...cards);
  } else {
    state.tableau[toIdx].push(...cards);
    if (fromType === "tableau") {
      const src = state.tableau[fromIdx];
      if (src.length > 0 && !src[src.length - 1].faceUp) {
        src[src.length - 1].faceUp = true;
      }
    }
  }

  return { success: true };
}

/**
 * Find the best destination for a single card (auto-move).
 * Returns { toType, toIdx } or null if no valid move found.
 */
export function findAutoMove(state, fromType, fromIdx, fromCardIdx) {
  const cards = getCards(state, fromType, fromIdx, fromCardIdx);
  if (cards.length !== 1) return null;

  // Try foundations first
  for (let i = 0; i < 4; i++) {
    if (canPlaceOnFoundation(state, cards[0], i)) {
      return { toType: "foundation", toIdx: i };
    }
  }

  // Try tableau
  for (let i = 0; i < 7; i++) {
    if (fromType === "tableau" && i === fromIdx) continue;
    if (canPlaceOnTableau(state, cards, i)) {
      return { toType: "tableau", toIdx: i };
    }
  }

  return null;
}

/**
 * Click the stock pile: draw a card to waste, or reset stock from waste.
 * Mutates state.
 */
export function clickStock(state) {
  if (state.stock.length === 0) {
    state.stock = state.waste.reverse();
    state.waste = [];
    state.stock.forEach((c) => (c.faceUp = false));
  } else {
    const card = state.stock.pop();
    card.faceUp = true;
    state.waste.push(card);
  }
}

/**
 * Check if the game is won (all four foundations have 13 cards).
 */
export function checkWin(state) {
  return state.foundations.every((p) => p.length === 13);
}
