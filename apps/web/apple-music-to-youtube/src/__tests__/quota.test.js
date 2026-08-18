import { describe, it, expect } from "vitest";
import {
  QUOTA_COSTS,
  DAILY_QUOTA_UNITS,
  estimateQuota,
  maxTracksWithin,
  formatQuota,
} from "../quota.js";

describe("QUOTA_COSTS", () => {
  it("matches the published YouTube Data API v3 costs", () => {
    expect(QUOTA_COSTS).toMatchObject({
      search: 100,
      videoDetails: 1,
      playlistCreate: 50,
      playlistInsert: 50,
    });
  });

  it("uses the documented default daily quota", () => {
    expect(DAILY_QUOTA_UNITS).toBe(10000);
  });
});

describe("estimateQuota", () => {
  it("charges search + details + insert per track, plus one playlist creation", () => {
    expect(estimateQuota(1)).toBe(50 + 100 + 1 + 50);
  });

  it("scales linearly with track count", () => {
    expect(estimateQuota(10)).toBe(50 + 10 * (100 + 1 + 50));
  });

  it("omits the creation cost when adding to an existing playlist", () => {
    expect(estimateQuota(1, { createPlaylist: false })).toBe(100 + 1 + 50);
  });

  it("is zero-ish for an empty playlist", () => {
    expect(estimateQuota(0, { createPlaylist: false })).toBe(0);
  });

  it("rejects a negative track count", () => {
    expect(() => estimateQuota(-1)).toThrow(/track count/i);
  });
});

describe("maxTracksWithin", () => {
  it("reports how many tracks fit in the free daily quota", () => {
    expect(maxTracksWithin(DAILY_QUOTA_UNITS)).toBe(65);
  });

  it("returns zero when the budget cannot even create the playlist", () => {
    expect(maxTracksWithin(10)).toBe(0);
  });

  it("never returns a negative number", () => {
    expect(maxTracksWithin(-500)).toBe(0);
  });
});

describe("formatQuota", () => {
  it("renders units with thousands separators", () => {
    expect(formatQuota(10000)).toBe("10,000");
  });
});
