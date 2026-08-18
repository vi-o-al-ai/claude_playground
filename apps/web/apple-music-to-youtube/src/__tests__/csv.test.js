import { describe, it, expect } from "vitest";
import { escapeCsvCell, buildResultsCsv, RESULTS_CSV_HEADER } from "../csv.js";

describe("escapeCsvCell", () => {
  it("wraps every value in quotes", () => {
    expect(escapeCsvCell("Roads")).toBe('"Roads"');
  });

  it("doubles embedded quotes", () => {
    expect(escapeCsvCell('The "Real" Thing')).toBe('"The ""Real"" Thing"');
  });

  it("keeps commas and newlines inside the quoted cell", () => {
    expect(escapeCsvCell("Hello, Goodbye")).toBe('"Hello, Goodbye"');
    expect(escapeCsvCell("two\nlines")).toBe('"two\nlines"');
  });

  it("renders null and undefined as empty cells", () => {
    expect(escapeCsvCell(null)).toBe('""');
    expect(escapeCsvCell(undefined)).toBe('""');
  });

  // Video and channel titles come from YouTube, so anyone can choose them.
  // A spreadsheet treats a leading =, +, - or @ as a formula (CWE-1236).
  it("neutralises a value a spreadsheet would run as a formula", () => {
    expect(escapeCsvCell('=HYPERLINK("http://evil","click")')).toBe(
      '"\'=HYPERLINK(""http://evil"",""click"")"',
    );
    expect(escapeCsvCell("+1234")).toBe('"\'+1234"');
    expect(escapeCsvCell("-2+3+cmd|' /C calc'!A0")).toBe("\"'-2+3+cmd|' /C calc'!A0\"");
    expect(escapeCsvCell("@SUM(A1)")).toBe('"\'@SUM(A1)"');
    expect(escapeCsvCell("\t=1+1")).toBe('"\'\t=1+1"');
  });

  it("leaves ordinary values that merely contain those characters alone", () => {
    expect(escapeCsvCell("Sun-Kissed")).toBe('"Sun-Kissed"');
    expect(escapeCsvCell("Blood on the Leaves (feat. C+C)")).toBe(
      '"Blood on the Leaves (feat. C+C)"',
    );
  });

  it("does not mangle a numeric score", () => {
    expect(escapeCsvCell("0.92")).toBe('"0.92"');
    expect(escapeCsvCell(3)).toBe('"3"');
  });
});

describe("buildResultsCsv", () => {
  const results = [
    {
      index: 0,
      track: { title: "Roads", artist: "Portishead" },
      status: "added",
      video: { videoId: "v1", title: "Portishead - Roads", channelTitle: "Portishead - Topic" },
      score: 0.9231,
    },
    { index: 1, track: { title: "Glory Box", artist: "Portishead" }, status: "no-match" },
  ];

  it("starts with the header row", () => {
    expect(buildResultsCsv(results).split("\n")[0]).toBe(RESULTS_CSV_HEADER.join(","));
  });

  it("writes one row per result, numbered from one", () => {
    const rows = buildResultsCsv(results).split("\n");
    expect(rows).toHaveLength(3);
    expect(rows[1]).toBe(
      '"1","Roads","Portishead","added","v1","Portishead - Roads","Portishead - Topic","0.92"',
    );
  });

  it("leaves the video columns empty for an unmatched track", () => {
    expect(buildResultsCsv(results).split("\n")[2]).toBe(
      '"2","Glory Box","Portishead","no-match","","","",""',
    );
  });

  it("returns just the header for an empty or missing result list", () => {
    expect(buildResultsCsv([])).toBe(RESULTS_CSV_HEADER.join(","));
    expect(buildResultsCsv()).toBe(RESULTS_CSV_HEADER.join(","));
  });

  it("neutralises a hostile video title end to end", () => {
    const hostile = [
      {
        index: 0,
        track: { title: "x" },
        status: "added",
        video: { videoId: "v", title: "=cmd|'/C calc'!A0", channelTitle: "c" },
      },
    ];
    expect(buildResultsCsv(hostile)).toContain("\"'=cmd|'/C calc'!A0\"");
  });
});
