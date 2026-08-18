/** Builds the downloadable results file. */

export const RESULTS_CSV_HEADER = [
  "#",
  "title",
  "artist",
  "status",
  "video_id",
  "video_title",
  "channel",
  "score",
];

// A spreadsheet runs a cell starting with any of these as a formula, and video
// and channel titles are chosen by whoever uploaded them (CWE-1236). Prefixing
// an apostrophe forces the cell back to plain text.
const FORMULA_START = /^[=+\-@\t\r]/;

export function escapeCsvCell(value) {
  const text = String(value ?? "");
  const safe = FORMULA_START.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function buildResultsCsv(results = []) {
  const rows = (results || []).map((result) =>
    [
      result.index + 1,
      result.track?.title,
      result.track?.artist,
      result.status,
      result.video?.videoId ?? "",
      result.video?.title ?? "",
      result.video?.channelTitle ?? "",
      result.score?.toFixed(2) ?? "",
    ]
      .map(escapeCsvCell)
      .join(","),
  );

  return [RESULTS_CSV_HEADER.join(","), ...rows].join("\n");
}
