/**
 * Scores YouTube search results against an Apple Music track.
 *
 * YouTube search will happily return a karaoke version, a fan cover or a
 * one-hour loop for a perfectly good query, so every candidate is scored on
 * title, artist and duration, then adjusted for the tell-tale signals of a
 * wrong upload.
 */
import { stripNoise, extractFeatured, primaryArtist } from "./query.js";

const ISO_DURATION = /^P(?:\d+D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;

const WEIGHTS = { title: 0.45, artist: 0.3, duration: 0.25 };
const DURATION_TOLERANCE_SEC = 45;

// Penalties apply only when the *candidate* says it and the source track does
// not — a track that is genuinely "(Live)" should match a live video.
const PENALTIES = [
  { pattern: /\bkaraoke\b/i, weight: 0.5, label: "karaoke" },
  { pattern: /\breaction\b/i, weight: 0.45, label: "reaction video" },
  {
    pattern: /\b(?:1|one)\s*hour\b|\bhour\s*(?:loop|version)\b/i,
    weight: 0.45,
    label: "hour-long upload",
  },
  { pattern: /\btype\s+beat\b/i, weight: 0.5, label: "type beat" },
  { pattern: /\bnightcore\b/i, weight: 0.4, label: "nightcore" },
  { pattern: /\b8\s*-?\s*bit\b/i, weight: 0.4, label: "8-bit version" },
  { pattern: /\btutorial\b|\bhow to play\b/i, weight: 0.4, label: "tutorial" },
  { pattern: /\bcover\b/i, weight: 0.3, label: "cover" },
  { pattern: /\binstrumental\b/i, weight: 0.3, label: "instrumental" },
  { pattern: /\bsped\s*up\b|\bspeed\s*up\b/i, weight: 0.3, label: "sped up" },
  { pattern: /\bslowed\b|\breverb\b/i, weight: 0.25, label: "slowed + reverb" },
  { pattern: /\bbass\s*boosted\b/i, weight: 0.3, label: "bass boosted" },
  { pattern: /\bmashup\b/i, weight: 0.3, label: "mashup" },
  { pattern: /\bremix\b/i, weight: 0.22, label: "remix" },
  { pattern: /\blive\b/i, weight: 0.18, label: "live version" },
];

const OFFICIAL = /\bofficial\s+(?:music\s+)?(?:video|audio)\b/i;
const TOPIC_CHANNEL = /\s-\sTopic$/;

/** "PT3M45S" -> 225. Returns null for live streams and malformed values. */
export function parseIsoDuration(iso) {
  const match = String(iso ?? "").match(ISO_DURATION);
  if (!match || (!match[1] && !match[2] && !match[3])) return null;
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
}

function tokenize(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

/** Share of `needles` that appear in `haystack`. */
function coverage(needles, haystack) {
  if (needles.length === 0) return null;
  const set = new Set(haystack);
  return needles.filter((token) => set.has(token)).length / needles.length;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

/**
 * @returns {{score: number, reasons: string[]}} score in [0, 1]
 */
export function scoreCandidate(track, candidate) {
  const reasons = [];
  const sourceTitle = stripNoise(track?.title);
  const { base } = extractFeatured(sourceTitle);
  const artist = primaryArtist(track?.artist);

  const candidateTitle = String(candidate?.title ?? "");
  const channelTitle = String(candidate?.channelTitle ?? "");
  const candidateTokens = tokenize(candidateTitle);
  const haystack = [...candidateTokens, ...tokenize(channelTitle)];

  const titleScore = coverage(tokenize(base), candidateTokens);
  const artistScore = artist ? coverage(tokenize(artist), haystack) : null;

  let durationScore = null;
  const trackDuration = Number(track?.durationSec) || null;
  const candidateDuration = Number(candidate?.durationSec) || null;
  if (trackDuration && candidateDuration) {
    const drift = Math.abs(trackDuration - candidateDuration);
    durationScore = clamp01(1 - drift / DURATION_TOLERANCE_SEC);
    if (durationScore > 0.8) reasons.push("duration matches");
  }

  const signals = [
    [titleScore, WEIGHTS.title],
    [artistScore, WEIGHTS.artist],
    [durationScore, WEIGHTS.duration],
  ].filter(([value]) => value !== null);

  const totalWeight = signals.reduce((sum, [, weight]) => sum + weight, 0);
  let score =
    totalWeight === 0
      ? 0
      : signals.reduce((sum, [value, weight]) => sum + value * weight, 0) / totalWeight;

  if (TOPIC_CHANNEL.test(channelTitle)) {
    score += 0.08;
    reasons.push("official artist Topic channel");
  }
  if (OFFICIAL.test(candidateTitle)) {
    score += 0.05;
    reasons.push("marked official");
  }
  if (
    artistScore !== null &&
    artistScore > 0.5 &&
    coverage(tokenize(artist), tokenize(channelTitle)) === 1
  ) {
    score += 0.04;
    reasons.push("channel matches artist");
  }

  for (const { pattern, weight, label } of PENALTIES) {
    if (pattern.test(candidateTitle) && !pattern.test(sourceTitle)) {
      score -= weight;
      reasons.push(`looks like a ${label}`);
    }
  }
  if (trackDuration && candidateDuration && candidateDuration > trackDuration * 2) {
    score -= 0.35;
    reasons.push("duration far longer than the track");
  }

  return { score: clamp01(score), reasons };
}

/** Bands a raw score for display. */
export function confidenceFor(score) {
  if (score >= 0.75) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

/**
 * Picks the best candidate, or null if nothing clears `minScore`.
 * Ties keep YouTube's own ranking, so results are stable across runs.
 */
export function pickBestMatch(track, candidates, options = {}) {
  const minScore = options.minScore ?? 0.5;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const ranked = candidates
    .map((video, index) => {
      const { score, reasons } = scoreCandidate(track, video);
      return { video, score, reasons, index, confidence: confidenceFor(score) };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const [best, ...rest] = ranked;
  if (best.score < minScore) return null;

  return {
    video: best.video,
    score: best.score,
    reasons: best.reasons,
    confidence: best.confidence,
    alternatives: rest,
  };
}
