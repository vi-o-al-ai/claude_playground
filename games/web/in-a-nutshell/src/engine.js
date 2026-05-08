/**
 * In a Nutshell engine: pure game logic with no DOM access.
 * State is treated as immutable — every mutating function returns a new state.
 */

export const VERIFICATION_STRICT = "strict";
export const VERIFICATION_FAITHFUL = "faithful";

const CLUE_COUNT = 10;

function normalize(text) {
  return String(text).trim().replace(/\s+/g, " ").toLowerCase();
}

export function matchesAnswer(guess, card) {
  const normalized = normalize(guess);
  if (!normalized) return false;
  const candidates = [card.answer, ...(card.aliases ?? [])].map(normalize);
  return candidates.includes(normalized);
}

export function createGame({ deck, playerCount, verificationMode = VERIFICATION_STRICT }) {
  if (!Array.isArray(deck) || deck.length === 0) {
    throw new Error("deck must contain at least one card");
  }
  if (!Number.isInteger(playerCount) || playerCount < 2) {
    throw new Error("playerCount must be an integer >= 2");
  }
  if (verificationMode !== VERIFICATION_STRICT && verificationMode !== VERIFICATION_FAITHFUL) {
    throw new Error(`unknown verificationMode: ${verificationMode}`);
  }
  return {
    deck,
    playerCount,
    completed: [],
    activeCard: null,
    currentPlayer: 0,
    verificationMode,
  };
}

function findCard(game, cardId) {
  return game.deck.find((c) => c.id === cardId);
}

export function selectCard(game, cardId) {
  const card = findCard(game, cardId);
  if (!card) throw new Error(`card not found: ${cardId}`);
  if (game.completed.includes(cardId)) {
    throw new Error(`card already completed: ${cardId}`);
  }
  return {
    ...game,
    activeCard: {
      id: card.id,
      clues: card.clues,
      answer: card.answer,
      aliases: card.aliases ?? [],
      revealed: Array(CLUE_COUNT).fill(false),
      answerRevealed: false,
      solved: false,
      lastGuess: null,
    },
    currentPlayer: 0,
  };
}

function requireActiveRound(game) {
  if (!game.activeCard) throw new Error("no active card");
  if (game.activeCard.solved) throw new Error("round already solved");
}

function nextPlayer(game) {
  return (game.currentPlayer + 1) % game.playerCount;
}

export function revealClue(game, index) {
  requireActiveRound(game);
  if (!Number.isInteger(index) || index < 0 || index >= CLUE_COUNT) {
    throw new Error(`clue index out of range: ${index}`);
  }
  if (game.activeCard.revealed[index]) {
    throw new Error(`clue already revealed: ${index}`);
  }
  const revealed = game.activeCard.revealed.slice();
  revealed[index] = true;
  return {
    ...game,
    activeCard: { ...game.activeCard, revealed },
    currentPlayer: nextPlayer(game),
  };
}

export function submitGuess(game, text) {
  requireActiveRound(game);
  if (!normalize(text)) throw new Error("guess must not be empty");
  const correct = matchesAnswer(text, game.activeCard);
  const lastGuess = { text, correct, by: game.currentPlayer };
  if (correct) {
    return {
      ...game,
      activeCard: {
        ...game.activeCard,
        solved: true,
        answerRevealed: true,
        lastGuess,
      },
      completed: [...game.completed, game.activeCard.id],
    };
  }
  const answerRevealed = game.verificationMode === VERIFICATION_FAITHFUL;
  return {
    ...game,
    activeCard: { ...game.activeCard, answerRevealed, lastGuess },
    currentPlayer: nextPlayer(game),
  };
}

export function coverAnswer(game) {
  if (!game.activeCard) throw new Error("no active card");
  if (game.activeCard.solved) {
    throw new Error("cannot cover a solved answer");
  }
  return {
    ...game,
    activeCard: { ...game.activeCard, answerRevealed: false },
  };
}
