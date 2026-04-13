import { describe, it, expect } from "vitest";
import {
  createSession,
  computeSummary,
  groupByModel,
  groupByCategory,
  groupByDay,
  computeStreak,
  computeWeekOverWeek,
  topTags,
  toIsoDay,
} from "../metrics.js";

// Deterministic reference point used across time-sensitive tests.
// Monday, 2026-04-13 12:00 UTC
const REF = Date.UTC(2026, 3, 13, 12, 0, 0);
const DAY_MS = 24 * 60 * 60 * 1000;

function at(daysAgo, hour = 10) {
  return REF - daysAgo * DAY_MS + (hour - 12) * 3600 * 1000;
}

describe("createSession", () => {
  it("fills in defaults for missing fields", () => {
    const s = createSession({});
    expect(typeof s.id).toBe("string");
    expect(s.id.length).toBeGreaterThan(0);
    expect(typeof s.timestamp).toBe("number");
    expect(s.model).toBe("unknown");
    expect(s.category).toBe("other");
    expect(s.durationMinutes).toBe(0);
    expect(s.promptTokens).toBe(0);
    expect(s.completionTokens).toBe(0);
    expect(s.cost).toBe(0);
    expect(s.rating).toBeNull();
    expect(s.notes).toBe("");
    expect(s.tags).toEqual([]);
  });

  it("preserves provided values", () => {
    const s = createSession({
      id: "abc",
      timestamp: 42,
      model: "claude-opus-4-6",
      category: "coding",
      durationMinutes: 30,
      promptTokens: 100,
      completionTokens: 200,
      cost: 0.5,
      rating: 4,
      notes: "hello",
      tags: ["x", "y"],
    });
    expect(s.id).toBe("abc");
    expect(s.timestamp).toBe(42);
    expect(s.model).toBe("claude-opus-4-6");
    expect(s.category).toBe("coding");
    expect(s.durationMinutes).toBe(30);
    expect(s.promptTokens).toBe(100);
    expect(s.completionTokens).toBe(200);
    expect(s.cost).toBe(0.5);
    expect(s.rating).toBe(4);
    expect(s.notes).toBe("hello");
    expect(s.tags).toEqual(["x", "y"]);
  });

  it("generates unique ids across calls", () => {
    const a = createSession({});
    const b = createSession({});
    expect(a.id).not.toBe(b.id);
  });

  it("copies tags array so caller mutation does not leak", () => {
    const tags = ["a"];
    const s = createSession({ tags });
    tags.push("b");
    expect(s.tags).toEqual(["a"]);
  });

  it("coerces invalid numeric fields to safe defaults", () => {
    const s = createSession({
      durationMinutes: "oops",
      promptTokens: NaN,
      cost: null,
      rating: "nope",
    });
    expect(s.durationMinutes).toBe(0);
    expect(s.promptTokens).toBe(0);
    expect(s.cost).toBe(0);
    expect(s.rating).toBeNull();
  });
});

describe("computeSummary", () => {
  it("returns zero totals for an empty list", () => {
    const s = computeSummary([]);
    expect(s).toEqual({
      totalSessions: 0,
      totalMinutes: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      averageRating: 0,
      ratedCount: 0,
    });
  });

  it("sums totals across sessions", () => {
    const sessions = [
      createSession({
        durationMinutes: 10,
        promptTokens: 100,
        completionTokens: 50,
        cost: 0.2,
        rating: 4,
      }),
      createSession({
        durationMinutes: 20,
        promptTokens: 200,
        completionTokens: 100,
        cost: 0.5,
        rating: 5,
      }),
      createSession({ durationMinutes: 5, promptTokens: 50, completionTokens: 25, cost: 0.1 }),
    ];
    const s = computeSummary(sessions);
    expect(s.totalSessions).toBe(3);
    expect(s.totalMinutes).toBe(35);
    expect(s.totalPromptTokens).toBe(350);
    expect(s.totalCompletionTokens).toBe(175);
    expect(s.totalTokens).toBe(525);
    expect(s.totalCost).toBeCloseTo(0.8, 5);
    expect(s.ratedCount).toBe(2);
    expect(s.averageRating).toBeCloseTo(4.5, 5);
  });

  it("returns averageRating 0 when no sessions are rated", () => {
    const sessions = [
      createSession({ durationMinutes: 5 }),
      createSession({ durationMinutes: 10 }),
    ];
    const s = computeSummary(sessions);
    expect(s.averageRating).toBe(0);
    expect(s.ratedCount).toBe(0);
  });
});

describe("groupByModel", () => {
  it("aggregates sessions by model", () => {
    const sessions = [
      createSession({
        model: "claude-opus-4-6",
        durationMinutes: 30,
        promptTokens: 100,
        completionTokens: 50,
        cost: 0.3,
        rating: 5,
      }),
      createSession({
        model: "claude-opus-4-6",
        durationMinutes: 10,
        promptTokens: 20,
        completionTokens: 10,
        cost: 0.1,
        rating: 3,
      }),
      createSession({
        model: "gpt-4o",
        durationMinutes: 15,
        promptTokens: 200,
        completionTokens: 100,
        cost: 0.4,
        rating: 4,
      }),
    ];
    const groups = groupByModel(sessions);
    expect(groups.length).toBe(2);
    const opus = groups.find((g) => g.key === "claude-opus-4-6");
    const gpt = groups.find((g) => g.key === "gpt-4o");
    expect(opus.count).toBe(2);
    expect(opus.minutes).toBe(40);
    expect(opus.tokens).toBe(180);
    expect(opus.cost).toBeCloseTo(0.4, 5);
    expect(opus.averageRating).toBeCloseTo(4, 5);
    expect(gpt.count).toBe(1);
    expect(gpt.tokens).toBe(300);
  });

  it("sorts groups by count descending", () => {
    const sessions = [
      createSession({ model: "a" }),
      createSession({ model: "b" }),
      createSession({ model: "b" }),
      createSession({ model: "c" }),
      createSession({ model: "c" }),
      createSession({ model: "c" }),
    ];
    const groups = groupByModel(sessions);
    expect(groups.map((g) => g.key)).toEqual(["c", "b", "a"]);
  });

  it("treats missing model as 'unknown'", () => {
    const sessions = [{ model: "", durationMinutes: 5, timestamp: 0 }];
    const groups = groupByModel(sessions);
    expect(groups[0].key).toBe("unknown");
  });
});

describe("groupByCategory", () => {
  it("aggregates sessions by category", () => {
    const sessions = [
      createSession({ category: "coding", durationMinutes: 30 }),
      createSession({ category: "coding", durationMinutes: 15 }),
      createSession({ category: "writing", durationMinutes: 20 }),
    ];
    const groups = groupByCategory(sessions);
    const coding = groups.find((g) => g.key === "coding");
    const writing = groups.find((g) => g.key === "writing");
    expect(coding.count).toBe(2);
    expect(coding.minutes).toBe(45);
    expect(writing.count).toBe(1);
    expect(writing.minutes).toBe(20);
  });
});

describe("toIsoDay", () => {
  it("formats a timestamp as YYYY-MM-DD in UTC", () => {
    expect(toIsoDay(Date.UTC(2026, 0, 1, 0, 0, 0))).toBe("2026-01-01");
    expect(toIsoDay(Date.UTC(2026, 3, 13, 23, 59, 59))).toBe("2026-04-13");
  });
});

describe("groupByDay", () => {
  it("groups sessions by UTC day, sorted ascending", () => {
    const sessions = [
      createSession({ timestamp: at(2), durationMinutes: 10 }),
      createSession({ timestamp: at(0), durationMinutes: 20 }),
      createSession({ timestamp: at(0), durationMinutes: 5 }),
      createSession({ timestamp: at(5), durationMinutes: 15 }),
    ];
    const days = groupByDay(sessions);
    expect(days.length).toBe(3);
    expect(days[0].day < days[1].day).toBe(true);
    expect(days[days.length - 1].day).toBe(toIsoDay(at(0)));
    const today = days.find((d) => d.day === toIsoDay(at(0)));
    expect(today.count).toBe(2);
    expect(today.minutes).toBe(25);
  });

  it("returns empty array for no sessions", () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe("computeStreak", () => {
  it("returns 0 for no sessions", () => {
    expect(computeStreak([], REF)).toBe(0);
  });

  it("returns 1 when only today has a session", () => {
    const sessions = [createSession({ timestamp: at(0) })];
    expect(computeStreak(sessions, REF)).toBe(1);
  });

  it("counts consecutive days leading up to today", () => {
    const sessions = [
      createSession({ timestamp: at(0) }),
      createSession({ timestamp: at(1) }),
      createSession({ timestamp: at(2) }),
      createSession({ timestamp: at(4) }), // gap at day 3 breaks streak
    ];
    expect(computeStreak(sessions, REF)).toBe(3);
  });

  it("allows streak to end at yesterday when today is empty", () => {
    const sessions = [createSession({ timestamp: at(1) }), createSession({ timestamp: at(2) })];
    expect(computeStreak(sessions, REF)).toBe(2);
  });

  it("returns 0 when the most recent session is older than yesterday", () => {
    const sessions = [createSession({ timestamp: at(3) }), createSession({ timestamp: at(4) })];
    expect(computeStreak(sessions, REF)).toBe(0);
  });

  it("treats multiple sessions on the same day as one day", () => {
    const sessions = [
      createSession({ timestamp: at(0, 9) }),
      createSession({ timestamp: at(0, 15) }),
      createSession({ timestamp: at(1, 10) }),
    ];
    expect(computeStreak(sessions, REF)).toBe(2);
  });
});

describe("computeWeekOverWeek", () => {
  it("splits sessions into current and previous 7-day windows", () => {
    const sessions = [
      createSession({ timestamp: at(0), durationMinutes: 10 }), // current
      createSession({ timestamp: at(3), durationMinutes: 20 }), // current
      createSession({ timestamp: at(6), durationMinutes: 5 }), // current (within 7 days)
      createSession({ timestamp: at(8), durationMinutes: 15 }), // previous
      createSession({ timestamp: at(13), durationMinutes: 10 }), // previous (boundary inside)
      createSession({ timestamp: at(20), durationMinutes: 100 }), // outside both
    ];
    const wow = computeWeekOverWeek(sessions, REF);
    expect(wow.current.count).toBe(3);
    expect(wow.current.minutes).toBe(35);
    expect(wow.previous.count).toBe(2);
    expect(wow.previous.minutes).toBe(25);
  });

  it("returns 0 percent change when both periods are empty", () => {
    const wow = computeWeekOverWeek([], REF);
    expect(wow.percentChangeCount).toBe(0);
    expect(wow.percentChangeMinutes).toBe(0);
  });

  it("returns 100 percent change when previous is zero but current is not", () => {
    const sessions = [createSession({ timestamp: at(0), durationMinutes: 10 })];
    const wow = computeWeekOverWeek(sessions, REF);
    expect(wow.percentChangeCount).toBe(100);
    expect(wow.percentChangeMinutes).toBe(100);
  });

  it("computes signed percent change", () => {
    const sessions = [
      createSession({ timestamp: at(0), durationMinutes: 5 }),
      createSession({ timestamp: at(8), durationMinutes: 10 }),
      createSession({ timestamp: at(10), durationMinutes: 10 }),
    ];
    const wow = computeWeekOverWeek(sessions, REF);
    // current = 1 session, previous = 2 sessions → -50%
    expect(wow.percentChangeCount).toBeCloseTo(-50, 5);
    // current minutes = 5, previous minutes = 20 → -75%
    expect(wow.percentChangeMinutes).toBeCloseTo(-75, 5);
  });
});

describe("topTags", () => {
  it("returns most-used tags in descending order", () => {
    const sessions = [
      createSession({ tags: ["js", "bug", "frontend"] }),
      createSession({ tags: ["js", "frontend"] }),
      createSession({ tags: ["js"] }),
      createSession({ tags: ["docs"] }),
    ];
    const top = topTags(sessions, 3);
    expect(top).toEqual([
      { tag: "js", count: 3 },
      { tag: "frontend", count: 2 },
      // the 3rd slot is either "bug" or "docs" (both count 1); allow either
      expect.objectContaining({ count: 1 }),
    ]);
  });

  it("respects the limit parameter", () => {
    const sessions = [
      createSession({ tags: ["a", "b", "c", "d"] }),
      createSession({ tags: ["a", "b", "c"] }),
    ];
    expect(topTags(sessions, 2).length).toBe(2);
  });

  it("returns an empty array when there are no tags", () => {
    expect(topTags([createSession({})])).toEqual([]);
  });
});
