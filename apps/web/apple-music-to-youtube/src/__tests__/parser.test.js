import { describe, it, expect } from "vitest";
import { decodePlaylistFile, detectFormat, parsePlaylist } from "../parser.js";

const APPLE_HEADER = [
  "Name",
  "Artist",
  "Composer",
  "Album",
  "Genre",
  "Size",
  "Time",
  "Disc Number",
].join("\t");

function appleRow({ name, artist, album, time }) {
  return [name, artist, "", album, "Rock", "8412345", String(time), "1"].join("\t");
}

describe("detectFormat", () => {
  it("detects an Apple Music tab-separated export", () => {
    const text = [
      APPLE_HEADER,
      appleRow({ name: "Roads", artist: "Portishead", album: "Dummy", time: 322 }),
    ].join("\n");
    expect(detectFormat(text)).toBe("tsv");
  });

  it("detects a csv export with a recognizable header", () => {
    expect(detectFormat("Title,Artist,Album\nRoads,Portishead,Dummy")).toBe("csv");
  });

  it("falls back to freeform lines when there is no header", () => {
    expect(detectFormat("Roads - Portishead\nGlory Box - Portishead")).toBe("lines");
  });

  it("treats a comma-containing freeform list as lines, not csv", () => {
    expect(detectFormat("Hello, Goodbye - The Beatles")).toBe("lines");
  });

  it("returns lines for empty input", () => {
    expect(detectFormat("")).toBe("lines");
    expect(detectFormat("   \n  ")).toBe("lines");
  });
});

describe("parsePlaylist — Apple Music tsv export", () => {
  const text = [
    APPLE_HEADER,
    appleRow({ name: "Roads", artist: "Portishead", album: "Dummy", time: 322 }),
    appleRow({ name: "Glory Box", artist: "Portishead", album: "Dummy", time: 305 }),
  ].join("\r\n");

  it("maps columns by header name", () => {
    const { format, tracks } = parsePlaylist(text);
    expect(format).toBe("tsv");
    expect(tracks).toHaveLength(2);
    expect(tracks[0]).toMatchObject({
      title: "Roads",
      artist: "Portishead",
      album: "Dummy",
      durationSec: 322,
    });
  });

  it("handles windows line endings without trailing carriage returns", () => {
    const { tracks } = parsePlaylist(text);
    expect(tracks[1].title).toBe("Glory Box");
    expect(tracks[1].artist).toBe("Portishead");
  });

  it("survives reordered columns", () => {
    const reordered = ["Artist\tName\tAlbum\tTime", "Portishead\tRoads\tDummy\t322"].join("\n");
    const { tracks } = parsePlaylist(reordered);
    expect(tracks[0]).toMatchObject({ title: "Roads", artist: "Portishead", durationSec: 322 });
  });

  it("accepts 'Title' as an alias for the name column", () => {
    const { tracks } = parsePlaylist("Title\tArtist\nRoads\tPortishead");
    expect(tracks[0]).toMatchObject({ title: "Roads", artist: "Portishead" });
  });

  it("skips rows with no title and reports why", () => {
    const withBlank = [
      APPLE_HEADER,
      appleRow({ name: "", artist: "Portishead", album: "Dummy", time: 322 }),
    ].join("\n");
    const { tracks, skipped } = parsePlaylist(withBlank);
    expect(tracks).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0]).toMatchObject({ lineNumber: 2, reason: "missing title" });
  });

  it("leaves duration null when the time column is absent or unparseable", () => {
    const { tracks } = parsePlaylist("Name\tArtist\tTime\nRoads\tPortishead\tnot-a-number");
    expect(tracks[0].durationSec).toBeNull();
  });

  it("falls back to first-two-columns when a tsv has no recognizable header", () => {
    const { tracks, format } = parsePlaylist("Roads\tPortishead\nGlory Box\tPortishead");
    expect(format).toBe("tsv");
    expect(tracks).toHaveLength(2);
    expect(tracks[0]).toMatchObject({ title: "Roads", artist: "Portishead" });
  });
});

describe("parsePlaylist — csv", () => {
  it("parses quoted fields containing commas", () => {
    const csv = ["Title,Artist,Album", '"Hello, Goodbye",The Beatles,"Magical Mystery Tour"'].join(
      "\n",
    );
    const { tracks } = parsePlaylist(csv);
    expect(tracks[0]).toMatchObject({
      title: "Hello, Goodbye",
      artist: "The Beatles",
      album: "Magical Mystery Tour",
    });
  });

  it("unescapes doubled quotes inside a quoted field", () => {
    const csv = ["Title,Artist", '"The ""Real"" Thing",Faith No More'].join("\n");
    expect(parsePlaylist(csv).tracks[0].title).toBe('The "Real" Thing');
  });
});

describe("parsePlaylist — freeform lines", () => {
  it("splits on a plain hyphen", () => {
    const { tracks } = parsePlaylist("Roads - Portishead");
    expect(tracks[0]).toMatchObject({ title: "Roads", artist: "Portishead" });
  });

  it("splits on en dash and em dash", () => {
    expect(parsePlaylist("Roads – Portishead").tracks[0].artist).toBe("Portishead");
    expect(parsePlaylist("Roads — Portishead").tracks[0].artist).toBe("Portishead");
  });

  it("honours artist-first ordering when asked", () => {
    const { tracks } = parsePlaylist("Portishead - Roads", { order: "artist-title" });
    expect(tracks[0]).toMatchObject({ title: "Roads", artist: "Portishead" });
  });

  it("strips leading track numbers", () => {
    expect(parsePlaylist("1. Roads - Portishead").tracks[0].title).toBe("Roads");
    expect(parsePlaylist("12) Roads - Portishead").tracks[0].title).toBe("Roads");
  });

  it("does not eat a numeric title", () => {
    expect(parsePlaylist("99 Problems - JAY-Z").tracks[0].title).toBe("99 Problems");
  });

  it("strips a trailing duration", () => {
    const { tracks } = parsePlaylist("Roads - Portishead (5:22)");
    expect(tracks[0].artist).toBe("Portishead");
    expect(tracks[0].durationSec).toBe(322);
  });

  it("keeps hyphenated titles intact by splitting on the last separator", () => {
    const { tracks } = parsePlaylist("Sunday Bloody Sunday - Live - U2");
    expect(tracks[0]).toMatchObject({ title: "Sunday Bloody Sunday - Live", artist: "U2" });
  });

  it("does not split on a hyphen without surrounding spaces", () => {
    expect(parsePlaylist("Jay-Z - 99 Problems", { order: "artist-title" }).tracks[0].artist).toBe(
      "Jay-Z",
    );
  });

  it("keeps a line with no separator as a title-only track and warns", () => {
    const { tracks, warnings } = parsePlaylist("Roads");
    expect(tracks[0]).toMatchObject({ title: "Roads", artist: "" });
    expect(warnings).toHaveLength(1);
    expect(warnings[0].reason).toMatch(/artist/i);
  });

  it("ignores blank lines and comments", () => {
    const { tracks, skipped } = parsePlaylist("\n# my playlist\nRoads - Portishead\n\n");
    expect(tracks).toHaveLength(1);
    expect(skipped.map((s) => s.reason)).toContain("comment");
  });

  it("returns an empty result for empty input rather than throwing", () => {
    expect(parsePlaylist("")).toMatchObject({ tracks: [], skipped: [], warnings: [] });
  });
});

describe("decodePlaylistFile", () => {
  function bytes(...values) {
    return new Uint8Array(values).buffer;
  }

  it("decodes utf-16le with a BOM (the Apple Music export default)", () => {
    const text = "Name\tArtist";
    const buf = new Uint8Array(2 + text.length * 2);
    buf[0] = 0xff;
    buf[1] = 0xfe;
    for (let i = 0; i < text.length; i += 1) {
      buf[2 + i * 2] = text.charCodeAt(i) & 0xff;
      buf[3 + i * 2] = text.charCodeAt(i) >> 8;
    }
    expect(decodePlaylistFile(buf.buffer)).toBe(text);
  });

  it("strips a utf-8 BOM", () => {
    expect(decodePlaylistFile(bytes(0xef, 0xbb, 0xbf, 0x41))).toBe("A");
  });

  it("decodes plain utf-8 without a BOM", () => {
    expect(decodePlaylistFile(bytes(0x41, 0x42))).toBe("AB");
  });
});
