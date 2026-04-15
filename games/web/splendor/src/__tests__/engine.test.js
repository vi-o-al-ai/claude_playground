import { describe, it, expect } from "vitest";
import {
  TIER1_CARDS,
  TIER2_CARDS,
  TIER3_CARDS,
  NOBLES,
  SplendorGame,
  PIECE_IDS,
  getAllCardIds,
  getAllNobleIds,
} from "../engine.js";

describe("card static definitions have stable IDs", () => {
  it("every Tier 1 card has a unique id matching card:t1:<index>", () => {
    expect(TIER1_CARDS).toHaveLength(40);
    TIER1_CARDS.forEach((card, i) => {
      expect(card.id).toBe(`card:t1:${i}`);
    });
    const ids = new Set(TIER1_CARDS.map((c) => c.id));
    expect(ids.size).toBe(TIER1_CARDS.length);
  });

  it("every Tier 2 card has a unique id matching card:t2:<index>", () => {
    expect(TIER2_CARDS).toHaveLength(30);
    TIER2_CARDS.forEach((card, i) => {
      expect(card.id).toBe(`card:t2:${i}`);
    });
    const ids = new Set(TIER2_CARDS.map((c) => c.id));
    expect(ids.size).toBe(TIER2_CARDS.length);
  });

  it("every Tier 3 card has a unique id matching card:t3:<index>", () => {
    expect(TIER3_CARDS).toHaveLength(20);
    TIER3_CARDS.forEach((card, i) => {
      expect(card.id).toBe(`card:t3:${i}`);
    });
    const ids = new Set(TIER3_CARDS.map((c) => c.id));
    expect(ids.size).toBe(TIER3_CARDS.length);
  });

  it("every noble has a unique id matching noble:<index>", () => {
    expect(NOBLES).toHaveLength(10);
    NOBLES.forEach((noble, i) => {
      expect(noble.id).toBe(`noble:${i}`);
    });
    const ids = new Set(NOBLES.map((n) => n.id));
    expect(ids.size).toBe(NOBLES.length);
  });

  it("card IDs across all tiers are globally unique", () => {
    const all = [...TIER1_CARDS, ...TIER2_CARDS, ...TIER3_CARDS].map((c) => c.id);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("PIECE_IDS export", () => {
  it("exposes gem, deck, and background piece IDs", () => {
    expect(PIECE_IDS.gems).toEqual([
      "gem:white",
      "gem:blue",
      "gem:green",
      "gem:red",
      "gem:black",
      "gem:gold",
    ]);
    expect(PIECE_IDS.decks).toEqual(["deck:t1", "deck:t2", "deck:t3"]);
    expect(PIECE_IDS.background).toBe("bg:body");
  });

  it("getAllCardIds returns 90 unique card IDs", () => {
    const ids = getAllCardIds();
    expect(ids).toHaveLength(90);
    expect(new Set(ids).size).toBe(90);
  });

  it("getAllNobleIds returns 10 unique noble IDs", () => {
    const ids = getAllNobleIds();
    expect(ids).toHaveLength(10);
    expect(new Set(ids).size).toBe(10);
  });
});

describe("SplendorGame preserves piece IDs through initialization", () => {
  it("every card (deck + visible) in every tier has a non-empty id", () => {
    const game = new SplendorGame(4, ["A", "B", "C", "D"]);
    game.state.tiers.forEach((tier, tIdx) => {
      const all = [...tier.deck, ...tier.visible.filter(Boolean)];
      all.forEach((card) => {
        expect(typeof card.id).toBe("string");
        expect(card.id).toMatch(new RegExp(`^card:t${tIdx + 1}:\\d+$`));
      });
    });
  });

  it("every drawn noble retains its id", () => {
    const game = new SplendorGame(3, ["A", "B", "C"]);
    game.state.nobles.forEach((noble) => {
      expect(typeof noble.id).toBe("string");
      expect(noble.id).toMatch(/^noble:\d+$/);
    });
  });

  it("getState/loadState round-trip preserves card and noble IDs", () => {
    const game = new SplendorGame(2, ["A", "B"]);
    const originalFirstCardId =
      game.state.tiers[0].deck[0]?.id ?? game.state.tiers[0].visible[0].id;
    const originalFirstNobleId = game.state.nobles[0].id;

    const snapshot = game.getState();
    const game2 = new SplendorGame(2, ["A", "B"]);
    game2.loadState(snapshot);

    const restoredFirstCard = game2.state.tiers[0].deck[0] ?? game2.state.tiers[0].visible[0];
    expect(restoredFirstCard.id).toBe(originalFirstCardId);
    expect(game2.state.nobles[0].id).toBe(originalFirstNobleId);
  });
});
