/**
 * Turns an exported/pasted Apple Music playlist into a list of tracks.
 *
 * Three shapes are supported:
 *  - "tsv"   Apple Music desktop export (File > Library > Export Playlist...)
 *  - "csv"   any comma-separated export that carries a header row
 *  - "lines" freeform "Title - Artist" lines pasted by hand
 */

const TITLE_HEADERS = ["name", "title", "song", "track"];
const ARTIST_HEADERS = ["artist", "artists", "album artist"];
const ALBUM_HEADERS = ["album"];
const TIME_HEADERS = ["time", "duration", "length"];

const SEPARATOR = /\s[-–—]\s/g;
const LEADING_INDEX = /^\d+\s*[.)]\s+/;
const TRAILING_TIME = /\s*[([]?(\d{1,3}):([0-5]\d)[)\]]?\s*$/;

/** Decodes a playlist file, honouring the UTF-16LE BOM Apple Music writes. */
export function decodePlaylistFile(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  }
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3));
  }
  return new TextDecoder("utf-8").decode(bytes);
}

function firstNonEmptyLine(text) {
  for (const line of String(text ?? "").split(/\r?\n/)) {
    if (line.trim()) return line;
  }
  return "";
}

function looksLikeHeader(fields) {
  const lower = fields.map((f) => f.trim().toLowerCase());
  return (
    lower.some((f) => TITLE_HEADERS.includes(f)) && lower.some((f) => ARTIST_HEADERS.includes(f))
  );
}

export function detectFormat(text) {
  const first = firstNonEmptyLine(text);
  if (!first) return "lines";
  if (first.includes("\t")) return "tsv";
  if (first.includes(",") && looksLikeHeader(splitCsvLine(first))) return "csv";
  return "lines";
}

/** Splits one CSV line, honouring quoted fields and doubled escape quotes. */
function splitCsvLine(line) {
  const fields = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

function columnIndexes(headerFields) {
  const lower = headerFields.map((f) => f.trim().toLowerCase());
  const find = (names) => lower.findIndex((f) => names.includes(f));
  return {
    title: find(TITLE_HEADERS),
    artist: find(ARTIST_HEADERS),
    album: find(ALBUM_HEADERS),
    time: find(TIME_HEADERS),
  };
}

function toDurationSec(raw) {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const clock = value.match(/^(\d{1,3}):([0-5]\d)$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  return /^\d+$/.test(value) ? Number(value) : null;
}

function parseDelimited(text, splitLine, format) {
  const lines = String(text).split(/\r?\n/);
  const tracks = [];
  const skipped = [];
  const warnings = [];

  const headerFields = splitLine(firstNonEmptyLine(text));
  const hasHeader = looksLikeHeader(headerFields);
  const cols = hasHeader
    ? columnIndexes(headerFields)
    : { title: 0, artist: 1, album: -1, time: -1 };
  let headerSeen = !hasHeader;

  lines.forEach((line, i) => {
    const lineNumber = i + 1;
    if (!line.trim()) return;
    if (!headerSeen) {
      headerSeen = true;
      return;
    }
    const fields = splitLine(line);
    const value = (index) =>
      index >= 0 && index < fields.length ? String(fields[index]).trim() : "";
    const title = value(cols.title);
    if (!title) {
      skipped.push({ line, lineNumber, reason: "missing title" });
      return;
    }
    const artist = value(cols.artist);
    tracks.push({
      title,
      artist,
      album: value(cols.album) || null,
      durationSec: toDurationSec(value(cols.time)),
    });
    if (!artist) {
      warnings.push({
        line,
        lineNumber,
        reason: "no artist on this row; will search by title only",
      });
    }
  });

  return { format, tracks, skipped, warnings };
}

function parseLines(text, order) {
  const tracks = [];
  const skipped = [];
  const warnings = [];

  String(text)
    .split(/\r?\n/)
    .forEach((rawLine, i) => {
      const lineNumber = i + 1;
      const line = rawLine.trim();
      if (!line) return;
      if (line.startsWith("#")) {
        skipped.push({ line: rawLine, lineNumber, reason: "comment" });
        return;
      }

      let rest = line.replace(LEADING_INDEX, "");
      let durationSec = null;
      const time = rest.match(TRAILING_TIME);
      if (time) {
        durationSec = Number(time[1]) * 60 + Number(time[2]);
        rest = rest.slice(0, time.index).trim();
      }

      const matches = [...rest.matchAll(SEPARATOR)];
      if (matches.length === 0) {
        tracks.push({ title: rest, artist: "", album: null, durationSec });
        warnings.push({
          line: rawLine,
          lineNumber,
          reason: "no artist found; will search by title only",
        });
        return;
      }

      // Title-first lists keep hyphens in the title ("Song - Live - Artist"),
      // so split on the last separator; artist-first lists split on the first.
      const split = order === "artist-title" ? matches[0] : matches[matches.length - 1];
      const left = rest.slice(0, split.index).trim();
      const right = rest.slice(split.index + split[0].length).trim();
      const [title, artist] = order === "artist-title" ? [right, left] : [left, right];

      if (!title) {
        skipped.push({ line: rawLine, lineNumber, reason: "missing title" });
        return;
      }
      tracks.push({ title, artist, album: null, durationSec });
    });

  return { format: "lines", tracks, skipped, warnings };
}

/**
 * @param {string} text raw pasted or uploaded playlist text
 * @param {{order?: "title-artist"|"artist-title"}} [options]
 * @returns {{format: string, tracks: Array, skipped: Array, warnings: Array}}
 */
export function parsePlaylist(text, options = {}) {
  const order = options.order === "artist-title" ? "artist-title" : "title-artist";
  const source = String(text ?? "");
  if (!source.trim()) return { format: "lines", tracks: [], skipped: [], warnings: [] };

  const format = detectFormat(source);
  if (format === "tsv") return parseDelimited(source, (line) => line.split("\t"), "tsv");
  if (format === "csv") return parseDelimited(source, splitCsvLine, "csv");
  return parseLines(source, order);
}
