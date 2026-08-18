import { describe, it, expect } from "vitest";
import { parseIsoDuration, scoreCandidate, pickBestMatch, confidenceFor } from "../match.js";

const track = { title: "Roads", artist: "Portishead", durationSec: 322 };

function candidate(overrides = {}) {
  return {
    videoId: "abc123",
    title: "Portishead - Roads",
    channelTitle: "Portishead - Topic",
    durationSec: 322,
    ...overrides,
  };
}

describe("parseIsoDuration", () => {
  it("parses minutes and seconds", () => {
    expect(parseIsoDuration("PT3M45S")).toBe(225);
  });

  it("parses hours", () => {
    expect(parseIsoDuration("PT1H2M3S")).toBe(3723);
  });

  it("parses a seconds-only duration", () => {
    expect(parseIsoDuration("PT45S")).toBe(45);
  });

  it("returns null for live streams and malformed values", () => {
    expect(parseIsoDuration("P0D")).toBeNull();
    expect(parseIsoDuration("")).toBeNull();
    expect(parseIsoDuration(null)).toBeNull();
    expect(parseIsoDuration("garbage")).toBeNull();
  });
});

describe("scoreCandidate", () => {
  it("scores an exact topic-channel match very highly", () => {
    expect(scoreCandidate(track, candidate()).score).toBeGreaterThan(0.85);
  });

  it("scores an unrelated video near zero", () => {
    const { score } = scoreCandidate(
      track,
      candidate({ title: "How to bake sourdough", channelTitle: "Bread Weekly", durationSec: 600 }),
    );
    expect(score).toBeLessThan(0.25);
  });

  it("prefers a title match on the right artist over the right title on the wrong artist", () => {
    const right = scoreCandidate(
      track,
      candidate({ title: "Roads", channelTitle: "Portishead" }),
    ).score;
    const wrong = scoreCandidate(
      track,
      candidate({ title: "Roads", channelTitle: "Some Cover Band" }),
    ).score;
    expect(right).toBeGreaterThan(wrong);
  });

  it("penalizes covers, karaoke and reactions", () => {
    const base = scoreCandidate(track, candidate()).score;
    for (const bad of [
      "Roads (Cover)",
      "Roads - Karaoke Version",
      "Roads REACTION!!",
      "Roads (Nightcore)",
    ]) {
      expect(scoreCandidate(track, candidate({ title: bad })).score).toBeLessThan(base);
    }
  });

  it("does not penalize a keyword the source track itself contains", () => {
    const liveTrack = { title: "Roads (Live)", artist: "Portishead", durationSec: 322 };
    const penalized = scoreCandidate(track, candidate({ title: "Roads (Live)" })).score;
    const notPenalized = scoreCandidate(liveTrack, candidate({ title: "Roads (Live)" })).score;
    expect(notPenalized).toBeGreaterThan(penalized);
  });

  it("penalizes an hour-long upload of a short song", () => {
    const { score, reasons } = scoreCandidate(
      track,
      candidate({ title: "Roads [1 HOUR]", durationSec: 3600 }),
    );
    expect(score).toBeLessThan(0.4);
    expect(reasons.join(" ")).toMatch(/duration|hour/i);
  });

  it("rewards a close duration and punishes a distant one", () => {
    const close = scoreCandidate(track, candidate({ durationSec: 325 })).score;
    const far = scoreCandidate(track, candidate({ durationSec: 150 })).score;
    expect(close).toBeGreaterThan(far);
  });

  it("still scores when duration is unknown on either side", () => {
    const { score } = scoreCandidate(
      { ...track, durationSec: null },
      candidate({ durationSec: null }),
    );
    expect(score).toBeGreaterThan(0.7);
  });

  it("always returns a score within 0 and 1", () => {
    const weird = scoreCandidate(
      track,
      candidate({ title: "cover karaoke instrumental reaction 1 hour nightcore" }),
    );
    expect(weird.score).toBeGreaterThanOrEqual(0);
    expect(weird.score).toBeLessThanOrEqual(1);
  });

  it("explains itself with reasons", () => {
    expect(scoreCandidate(track, candidate()).reasons).toEqual(
      expect.arrayContaining([expect.stringMatching(/topic/i)]),
    );
  });
});

describe("confidenceFor", () => {
  it("bands scores into high, medium and low", () => {
    expect(confidenceFor(0.9)).toBe("high");
    expect(confidenceFor(0.6)).toBe("medium");
    expect(confidenceFor(0.2)).toBe("low");
  });
});

describe("pickBestMatch", () => {
  it("returns the highest scoring candidate", () => {
    const best = pickBestMatch(track, [
      candidate({ videoId: "cover", title: "Roads (Cover by Someone)", channelTitle: "Someone" }),
      candidate({ videoId: "official" }),
    ]);
    expect(best.video.videoId).toBe("official");
    expect(best.confidence).toBe("high");
  });

  it("returns null when there are no candidates", () => {
    expect(pickBestMatch(track, [])).toBeNull();
    expect(pickBestMatch(track, null)).toBeNull();
  });

  it("returns null when nothing clears the minimum score", () => {
    const junk = [
      candidate({ title: "Sourdough tutorial", channelTitle: "Bread Weekly", durationSec: 900 }),
    ];
    expect(pickBestMatch(track, junk, { minScore: 0.5 })).toBeNull();
  });

  it("surfaces runners-up so the user can override the pick", () => {
    const best = pickBestMatch(track, [
      candidate({ videoId: "a" }),
      candidate({ videoId: "b", title: "Roads" }),
    ]);
    expect(best.alternatives.map((a) => a.video.videoId)).toEqual(["b"]);
  });

  it("breaks ties deterministically by preserving search order", () => {
    const best = pickBestMatch(track, [
      candidate({ videoId: "first" }),
      candidate({ videoId: "second" }),
    ]);
    expect(best.video.videoId).toBe("first");
  });
});
