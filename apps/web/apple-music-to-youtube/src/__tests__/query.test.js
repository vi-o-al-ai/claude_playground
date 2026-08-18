import { describe, it, expect } from "vitest";
import { stripNoise, extractFeatured, primaryArtist, buildSearchQuery } from "../query.js";

describe("stripNoise", () => {
  it("removes remaster tags in parentheses", () => {
    expect(stripNoise("Come Together (Remastered 2009)")).toBe("Come Together");
    expect(stripNoise("Come Together (2009 Remaster)")).toBe("Come Together");
  });

  it("removes trailing dash-delimited remaster tags", () => {
    expect(stripNoise("Come Together - 2009 Remaster")).toBe("Come Together");
  });

  it("removes edition and bonus-track noise", () => {
    expect(stripNoise("Song (Deluxe Edition)")).toBe("Song");
    expect(stripNoise("Song (Bonus Track)")).toBe("Song");
    expect(stripNoise("Song [Explicit]")).toBe("Song");
    expect(stripNoise("Song (Single Version)")).toBe("Song");
    expect(stripNoise("Song (Album Version)")).toBe("Song");
  });

  it("keeps musically meaningful qualifiers", () => {
    expect(stripNoise("Song (Live)")).toBe("Song (Live)");
    expect(stripNoise("Song (Acoustic)")).toBe("Song (Acoustic)");
    expect(stripNoise("Song (Kanye West Remix)")).toBe("Song (Kanye West Remix)");
  });

  it("leaves a clean title untouched and collapses stray whitespace", () => {
    expect(stripNoise("Roads")).toBe("Roads");
    expect(stripNoise("  Roads   Again ")).toBe("Roads Again");
  });

  it("handles empty and nullish input", () => {
    expect(stripNoise("")).toBe("");
    expect(stripNoise(null)).toBe("");
    expect(stripNoise(undefined)).toBe("");
  });

  it("does not strip a title that is entirely a noise word", () => {
    expect(stripNoise("Remaster")).toBe("Remaster");
  });
});

describe("extractFeatured", () => {
  it("pulls featured artists out of parentheses", () => {
    expect(extractFeatured("Song (feat. Nas)")).toEqual({ base: "Song", featured: ["Nas"] });
    expect(extractFeatured("Song [ft. Nas]")).toEqual({ base: "Song", featured: ["Nas"] });
  });

  it("pulls a trailing unbracketed feature credit", () => {
    expect(extractFeatured("Song feat. Nas")).toEqual({ base: "Song", featured: ["Nas"] });
  });

  it("splits multiple featured artists", () => {
    expect(extractFeatured("Song (feat. Nas & Jay Electronica)")).toEqual({
      base: "Song",
      featured: ["Nas", "Jay Electronica"],
    });
  });

  it("keeps an artist name that merely starts with x", () => {
    expect(extractFeatured("Renegades (feat. X Ambassadors)")).toEqual({
      base: "Renegades",
      featured: ["X Ambassadors"],
    });
  });

  it("still splits an x-joined collaboration", () => {
    expect(extractFeatured("Song (feat. Nas x Jay Electronica)")).toEqual({
      base: "Song",
      featured: ["Nas", "Jay Electronica"],
    });
  });

  it("returns an empty list when there is no credit", () => {
    expect(extractFeatured("Roads")).toEqual({ base: "Roads", featured: [] });
  });

  it("is not confused by the word 'often' or other ft-substrings", () => {
    expect(extractFeatured("Soft Machine")).toEqual({ base: "Soft Machine", featured: [] });
  });
});

describe("primaryArtist", () => {
  it("drops feature credits", () => {
    expect(primaryArtist("Kanye West feat. Jamie Foxx")).toBe("Kanye West");
    expect(primaryArtist("Kanye West ft. Jamie Foxx")).toBe("Kanye West");
    expect(primaryArtist("Kanye West featuring Jamie Foxx")).toBe("Kanye West");
  });

  it("keeps ampersands and commas that are part of a band name", () => {
    expect(primaryArtist("Simon & Garfunkel")).toBe("Simon & Garfunkel");
    expect(primaryArtist("Earth, Wind & Fire")).toBe("Earth, Wind & Fire");
  });

  it("handles empty input", () => {
    expect(primaryArtist("")).toBe("");
    expect(primaryArtist(null)).toBe("");
  });
});

describe("buildSearchQuery", () => {
  it("combines cleaned title and artist", () => {
    expect(
      buildSearchQuery({ title: "Come Together (Remastered 2009)", artist: "The Beatles" }),
    ).toBe("Come Together The Beatles");
  });

  it("keeps featured artists as extra search signal", () => {
    expect(
      buildSearchQuery({ title: "Gold Digger (feat. Jamie Foxx)", artist: "Kanye West" }),
    ).toBe("Gold Digger Kanye West Jamie Foxx");
  });

  it("does not duplicate a featured artist already named in the artist field", () => {
    expect(
      buildSearchQuery({
        title: "Gold Digger (feat. Jamie Foxx)",
        artist: "Kanye West feat. Jamie Foxx",
      }),
    ).toBe("Gold Digger Kanye West Jamie Foxx");
  });

  it("works with a title-only track", () => {
    expect(buildSearchQuery({ title: "Roads", artist: "" })).toBe("Roads");
  });

  it("returns an empty string for an empty track", () => {
    expect(buildSearchQuery({ title: "", artist: "" })).toBe("");
  });
});
