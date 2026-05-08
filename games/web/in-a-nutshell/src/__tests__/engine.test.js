import { describe, it, expect } from "vitest";
import {
  matchesAnswer,
  createGame,
  revealClue,
  submitGuess,
  coverAnswer,
  selectCard,
  VERIFICATION_STRICT,
  VERIFICATION_FAITHFUL,
} from "../engine.js";

const SAMPLE_CARD = {
  id: "fondue",
  clues: [
    "swiss",
    "dish",
    "where",
    "food",
    "involves",
    "submerging",
    "in",
    "melted",
    "cheese",
    "pot",
  ],
  answer: "Fondue",
  aliases: ["cheese fondue"],
};

const SECOND_CARD = {
  id: "pizza",
  clues: [
    "italian",
    "round",
    "flat",
    "bread",
    "topped",
    "with",
    "tomato",
    "cheese",
    "and",
    "toppings",
  ],
  answer: "Pizza",
  aliases: [],
};

const DECK = [SAMPLE_CARD, SECOND_CARD];

describe("matchesAnswer", () => {
  it("matches the canonical answer exactly", () => {
    expect(matchesAnswer("Fondue", SAMPLE_CARD)).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(matchesAnswer("fondue", SAMPLE_CARD)).toBe(true);
    expect(matchesAnswer("FONDUE", SAMPLE_CARD)).toBe(true);
    expect(matchesAnswer("FoNdUe", SAMPLE_CARD)).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    expect(matchesAnswer("  fondue  ", SAMPLE_CARD)).toBe(true);
    expect(matchesAnswer("\tfondue\n", SAMPLE_CARD)).toBe(true);
  });

  it("collapses internal whitespace", () => {
    expect(matchesAnswer("cheese  fondue", SAMPLE_CARD)).toBe(true);
    expect(matchesAnswer("cheese\tfondue", SAMPLE_CARD)).toBe(true);
  });

  it("matches accepted aliases", () => {
    expect(matchesAnswer("cheese fondue", SAMPLE_CARD)).toBe(true);
    expect(matchesAnswer("CHEESE FONDUE", SAMPLE_CARD)).toBe(true);
  });

  it("returns false for unrelated guesses", () => {
    expect(matchesAnswer("pizza", SAMPLE_CARD)).toBe(false);
    expect(matchesAnswer("", SAMPLE_CARD)).toBe(false);
    expect(matchesAnswer("   ", SAMPLE_CARD)).toBe(false);
  });

  it("returns false for partial matches", () => {
    expect(matchesAnswer("fond", SAMPLE_CARD)).toBe(false);
    expect(matchesAnswer("fondues", SAMPLE_CARD)).toBe(false);
  });
});

describe("createGame", () => {
  it("starts with no card selected and an empty completed set", () => {
    const game = createGame({ deck: DECK, playerCount: 3 });
    expect(game.deck).toEqual(DECK);
    expect(game.playerCount).toBe(3);
    expect(game.completed).toEqual([]);
    expect(game.activeCard).toBeNull();
    expect(game.verificationMode).toBe(VERIFICATION_STRICT);
  });

  it("accepts a verification mode override", () => {
    const game = createGame({
      deck: DECK,
      playerCount: 2,
      verificationMode: VERIFICATION_FAITHFUL,
    });
    expect(game.verificationMode).toBe(VERIFICATION_FAITHFUL);
  });

  it("rejects player counts below 2", () => {
    expect(() => createGame({ deck: DECK, playerCount: 1 })).toThrow();
    expect(() => createGame({ deck: DECK, playerCount: 0 })).toThrow();
  });

  it("rejects an empty deck", () => {
    expect(() => createGame({ deck: [], playerCount: 2 })).toThrow();
  });
});

describe("selectCard", () => {
  it("activates the chosen card with all 10 pills hidden and answer hidden", () => {
    const game = createGame({ deck: DECK, playerCount: 2 });
    const next = selectCard(game, "fondue");
    expect(next.activeCard.id).toBe("fondue");
    expect(next.activeCard.revealed).toEqual(Array(10).fill(false));
    expect(next.activeCard.answerRevealed).toBe(false);
    expect(next.activeCard.solved).toBe(false);
    expect(next.currentPlayer).toBe(0);
  });

  it("throws when the card id is not in the deck", () => {
    const game = createGame({ deck: DECK, playerCount: 2 });
    expect(() => selectCard(game, "missing")).toThrow();
  });

  it("throws when selecting a card that is already completed", () => {
    let game = createGame({ deck: DECK, playerCount: 2 });
    game = selectCard(game, "fondue");
    game = submitGuess(game, "Fondue");
    expect(() => selectCard(game, "fondue")).toThrow();
  });
});

describe("revealClue", () => {
  it("reveals a single pill and rotates the turn", () => {
    let game = createGame({ deck: DECK, playerCount: 3 });
    game = selectCard(game, "fondue");
    expect(game.currentPlayer).toBe(0);
    game = revealClue(game, 4);
    expect(game.activeCard.revealed[4]).toBe(true);
    expect(game.activeCard.revealed.filter(Boolean).length).toBe(1);
    expect(game.currentPlayer).toBe(1);
  });

  it("rotates back to player 0 after the last player", () => {
    let game = createGame({ deck: DECK, playerCount: 2 });
    game = selectCard(game, "fondue");
    game = revealClue(game, 0);
    expect(game.currentPlayer).toBe(1);
    game = revealClue(game, 1);
    expect(game.currentPlayer).toBe(0);
  });

  it("throws when revealing an out-of-range pill", () => {
    let game = createGame({ deck: DECK, playerCount: 2 });
    game = selectCard(game, "fondue");
    expect(() => revealClue(game, -1)).toThrow();
    expect(() => revealClue(game, 10)).toThrow();
  });

  it("throws when revealing an already-revealed pill", () => {
    let game = createGame({ deck: DECK, playerCount: 2 });
    game = selectCard(game, "fondue");
    game = revealClue(game, 3);
    expect(() => revealClue(game, 3)).toThrow();
  });

  it("throws when no card is active", () => {
    const game = createGame({ deck: DECK, playerCount: 2 });
    expect(() => revealClue(game, 0)).toThrow();
  });

  it("throws when the round is already solved", () => {
    let game = createGame({ deck: DECK, playerCount: 2 });
    game = selectCard(game, "fondue");
    game = submitGuess(game, "Fondue");
    expect(() => revealClue(game, 0)).toThrow();
  });
});

describe("submitGuess — strict mode", () => {
  it("marks the card solved on a correct guess and adds it to completed", () => {
    let game = createGame({
      deck: DECK,
      playerCount: 2,
      verificationMode: VERIFICATION_STRICT,
    });
    game = selectCard(game, "fondue");
    game = submitGuess(game, "Fondue");
    expect(game.activeCard.solved).toBe(true);
    expect(game.activeCard.lastGuess).toEqual({
      text: "Fondue",
      correct: true,
      by: 0,
    });
    expect(game.activeCard.answerRevealed).toBe(true);
    expect(game.completed).toContain("fondue");
  });

  it("does not reveal the answer on a wrong guess in strict mode", () => {
    let game = createGame({
      deck: DECK,
      playerCount: 2,
      verificationMode: VERIFICATION_STRICT,
    });
    game = selectCard(game, "fondue");
    game = submitGuess(game, "Pizza");
    expect(game.activeCard.solved).toBe(false);
    expect(game.activeCard.answerRevealed).toBe(false);
    expect(game.activeCard.lastGuess).toEqual({
      text: "Pizza",
      correct: false,
      by: 0,
    });
  });

  it("rotates the turn after a wrong guess", () => {
    let game = createGame({ deck: DECK, playerCount: 2 });
    game = selectCard(game, "fondue");
    game = submitGuess(game, "Pizza");
    expect(game.currentPlayer).toBe(1);
  });

  it("does not rotate the turn after a correct guess (round is over)", () => {
    let game = createGame({ deck: DECK, playerCount: 3 });
    game = selectCard(game, "fondue");
    game = revealClue(game, 0); // player 0 → player 1
    game = submitGuess(game, "Fondue"); // player 1 wins
    expect(game.activeCard.lastGuess.by).toBe(1);
    expect(game.currentPlayer).toBe(1);
  });
});

describe("submitGuess — faithful mode", () => {
  it("reveals the answer slot on a wrong guess so the guesser can peek", () => {
    let game = createGame({
      deck: DECK,
      playerCount: 2,
      verificationMode: VERIFICATION_FAITHFUL,
    });
    game = selectCard(game, "fondue");
    game = submitGuess(game, "Pizza");
    expect(game.activeCard.solved).toBe(false);
    expect(game.activeCard.answerRevealed).toBe(true);
    expect(game.activeCard.lastGuess.correct).toBe(false);
  });

  it("still wins the round on a correct guess", () => {
    let game = createGame({
      deck: DECK,
      playerCount: 2,
      verificationMode: VERIFICATION_FAITHFUL,
    });
    game = selectCard(game, "fondue");
    game = submitGuess(game, "fondue");
    expect(game.activeCard.solved).toBe(true);
    expect(game.activeCard.answerRevealed).toBe(true);
  });
});

describe("coverAnswer", () => {
  it("re-hides the answer after a wrong faithful-mode guess", () => {
    let game = createGame({
      deck: DECK,
      playerCount: 2,
      verificationMode: VERIFICATION_FAITHFUL,
    });
    game = selectCard(game, "fondue");
    game = submitGuess(game, "Pizza");
    expect(game.activeCard.answerRevealed).toBe(true);
    game = coverAnswer(game);
    expect(game.activeCard.answerRevealed).toBe(false);
  });

  it("does not allow re-hiding once the round is solved", () => {
    let game = createGame({
      deck: DECK,
      playerCount: 2,
      verificationMode: VERIFICATION_FAITHFUL,
    });
    game = selectCard(game, "fondue");
    game = submitGuess(game, "Fondue");
    expect(() => coverAnswer(game)).toThrow();
  });
});

describe("submitGuess — input validation", () => {
  it("throws when no card is active", () => {
    const game = createGame({ deck: DECK, playerCount: 2 });
    expect(() => submitGuess(game, "Fondue")).toThrow();
  });

  it("throws when guess is empty or whitespace-only", () => {
    let game = createGame({ deck: DECK, playerCount: 2 });
    game = selectCard(game, "fondue");
    expect(() => submitGuess(game, "")).toThrow();
    expect(() => submitGuess(game, "   ")).toThrow();
  });

  it("throws when the round is already solved", () => {
    let game = createGame({ deck: DECK, playerCount: 2 });
    game = selectCard(game, "fondue");
    game = submitGuess(game, "Fondue");
    expect(() => submitGuess(game, "Pizza")).toThrow();
  });
});

describe("multi-round flow", () => {
  it("can play a second card after completing the first", () => {
    let game = createGame({ deck: DECK, playerCount: 2 });
    game = selectCard(game, "fondue");
    game = submitGuess(game, "Fondue");
    expect(game.completed).toEqual(["fondue"]);

    game = selectCard(game, "pizza");
    expect(game.activeCard.id).toBe("pizza");
    expect(game.activeCard.revealed).toEqual(Array(10).fill(false));
    expect(game.activeCard.solved).toBe(false);
    expect(game.currentPlayer).toBe(0);

    game = submitGuess(game, "pizza");
    expect(game.activeCard.solved).toBe(true);
    expect(game.completed).toEqual(["fondue", "pizza"]);
  });
});
