/** Cleans up Apple Music track metadata into a YouTube search query. */

// Qualifiers that describe the *release*, not the recording — safe to drop.
// Anything that changes what you'd actually hear (live, acoustic, remix) stays.
const NOISE =
  /^(?:\d{4}\s+)?(?:digital\s+)?(?:remaster(?:ed)?(?:\s+version)?(?:\s+\d{4})?|deluxe(?:\s+edition)?|expanded(?:\s+edition)?|bonus\s+track|explicit(?:\s+version)?|clean(?:\s+version)?|single\s+version|album\s+version|mono(?:\s+version)?|stereo(?:\s+version)?|\d+(?:st|nd|rd|th)\s+anniversary(?:\s+edition)?)$/i;

const FEAT_BRACKETED = /[([]\s*(?:feat|ft|featuring)\b\.?\s*([^)\]]+)[)\]]/i;
const FEAT_TRAILING = /\s+(?:feat|ft|featuring)\b\.?\s+(.+)$/i;
// The "A x B" collab separator needs space on both sides: a bare \bx\b would
// also match the first word of names like "X Ambassadors" and eat it.
const FEAT_SPLIT = /\s*,\s*|\s*&\s*|\s+x\s+/i;

const collapse = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

/** Strips remaster/edition tags while keeping meaningful qualifiers. */
export function stripNoise(title) {
  const original = collapse(title);
  if (!original) return "";

  let result = original.replace(/[([]([^)\]]*)[)\]]/g, (match, inner) =>
    NOISE.test(inner.trim()) ? " " : match,
  );

  const parts = result.split(/\s+-\s+/);
  while (parts.length > 1 && NOISE.test(parts[parts.length - 1].trim())) parts.pop();
  result = collapse(parts.join(" - "));

  return result || original;
}

/** Separates a title from its "feat." credit. */
export function extractFeatured(title) {
  const source = collapse(title);
  if (!source) return { base: "", featured: [] };

  const bracketed = source.match(FEAT_BRACKETED);
  if (bracketed) {
    return {
      base: collapse(source.replace(FEAT_BRACKETED, " ")),
      featured: splitArtists(bracketed[1]),
    };
  }
  const trailing = source.match(FEAT_TRAILING);
  if (trailing) {
    return {
      base: collapse(source.slice(0, trailing.index)),
      featured: splitArtists(trailing[1]),
    };
  }
  return { base: source, featured: [] };
}

function splitArtists(value) {
  return collapse(value)
    .split(FEAT_SPLIT)
    .map((name) => name.trim())
    .filter(Boolean);
}

/**
 * The billed artist without feature credits. Ampersands and commas are left
 * alone so band names ("Simon & Garfunkel", "Earth, Wind & Fire") survive.
 */
export function primaryArtist(artist) {
  const source = collapse(artist);
  if (!source) return "";
  const cut = source.split(/\s*[([]?\b(?:feat|ft|featuring)\b\.?\s*/i)[0];
  return collapse(cut.replace(/[([]\s*$/, "")) || source;
}

/** Builds the string handed to YouTube search. */
export function buildSearchQuery(track) {
  const { base, featured } = extractFeatured(stripNoise(track?.title));
  const artist = primaryArtist(track?.artist);
  const fromArtistField = extractFeatured(collapse(track?.artist)).featured;

  const parts = [base, artist].filter(Boolean);
  for (const name of [...featured, ...fromArtistField]) {
    const haystack = parts.join(" ").toLowerCase();
    if (name && !haystack.includes(name.toLowerCase())) parts.push(name);
  }
  return collapse(parts.join(" "));
}
