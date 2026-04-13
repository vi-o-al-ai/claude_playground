/**
 * AI metrics engine.
 *
 * Pure functions that derive aggregate statistics from a list of sessions.
 * No DOM, no storage, no side effects — everything here is fully testable.
 *
 * A session records a single interaction with an AI model. The shape returned
 * from createSession() is the canonical, normalized form the rest of the
 * dashboard assumes.
 */

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function numOrDefault(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function generateId() {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `s_${time}_${rand}`;
}

/**
 * Normalize a partial session object into the canonical shape. Missing or
 * invalid fields are coerced to safe defaults. Unknown numeric ratings become
 * `null` so we can distinguish "not rated" from "rated 0".
 */
export function createSession(partial = {}) {
  return {
    id: typeof partial.id === "string" && partial.id.length > 0 ? partial.id : generateId(),
    timestamp: numOrDefault(partial.timestamp, Date.now()),
    model:
      typeof partial.model === "string" && partial.model.length > 0 ? partial.model : "unknown",
    category:
      typeof partial.category === "string" && partial.category.length > 0
        ? partial.category
        : "other",
    durationMinutes: Math.max(0, numOrDefault(partial.durationMinutes, 0)),
    promptTokens: Math.max(0, numOrDefault(partial.promptTokens, 0)),
    completionTokens: Math.max(0, numOrDefault(partial.completionTokens, 0)),
    cost: Math.max(0, numOrDefault(partial.cost, 0)),
    rating: Number.isFinite(partial.rating) ? partial.rating : null,
    notes: typeof partial.notes === "string" ? partial.notes : "",
    tags: Array.isArray(partial.tags) ? [...partial.tags] : [],
  };
}

/**
 * Format a timestamp (ms since epoch) as a UTC `YYYY-MM-DD` day key. Using
 * UTC keeps grouping deterministic across timezones.
 */
export function toIsoDay(timestamp) {
  const d = new Date(timestamp);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Reduce a list of sessions into total counters. averageRating is computed
 * only over sessions that were explicitly rated.
 */
export function computeSummary(sessions) {
  const summary = {
    totalSessions: sessions.length,
    totalMinutes: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalTokens: 0,
    totalCost: 0,
    averageRating: 0,
    ratedCount: 0,
  };
  let ratingSum = 0;
  for (const s of sessions) {
    summary.totalMinutes += numOrDefault(s.durationMinutes, 0);
    summary.totalPromptTokens += numOrDefault(s.promptTokens, 0);
    summary.totalCompletionTokens += numOrDefault(s.completionTokens, 0);
    summary.totalCost += numOrDefault(s.cost, 0);
    if (Number.isFinite(s.rating)) {
      ratingSum += s.rating;
      summary.ratedCount += 1;
    }
  }
  summary.totalTokens = summary.totalPromptTokens + summary.totalCompletionTokens;
  summary.averageRating = summary.ratedCount > 0 ? ratingSum / summary.ratedCount : 0;
  return summary;
}

function aggregateBy(sessions, keyFn) {
  const map = new Map();
  for (const s of sessions) {
    const rawKey = keyFn(s);
    const key = typeof rawKey === "string" && rawKey.length > 0 ? rawKey : "unknown";
    let g = map.get(key);
    if (!g) {
      g = { key, count: 0, minutes: 0, tokens: 0, cost: 0, ratingSum: 0, ratedCount: 0 };
      map.set(key, g);
    }
    g.count += 1;
    g.minutes += numOrDefault(s.durationMinutes, 0);
    g.tokens += numOrDefault(s.promptTokens, 0) + numOrDefault(s.completionTokens, 0);
    g.cost += numOrDefault(s.cost, 0);
    if (Number.isFinite(s.rating)) {
      g.ratingSum += s.rating;
      g.ratedCount += 1;
    }
  }
  return [...map.values()]
    .map((g) => ({
      key: g.key,
      count: g.count,
      minutes: g.minutes,
      tokens: g.tokens,
      cost: g.cost,
      averageRating: g.ratedCount > 0 ? g.ratingSum / g.ratedCount : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export function groupByModel(sessions) {
  return aggregateBy(sessions, (s) => s.model);
}

export function groupByCategory(sessions) {
  return aggregateBy(sessions, (s) => s.category);
}

/**
 * Aggregate sessions into per-day buckets, sorted oldest → newest.
 */
export function groupByDay(sessions) {
  const map = new Map();
  for (const s of sessions) {
    const day = toIsoDay(s.timestamp);
    let bucket = map.get(day);
    if (!bucket) {
      bucket = { day, count: 0, minutes: 0, cost: 0 };
      map.set(day, bucket);
    }
    bucket.count += 1;
    bucket.minutes += numOrDefault(s.durationMinutes, 0);
    bucket.cost += numOrDefault(s.cost, 0);
  }
  return [...map.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/**
 * Count the longest run of consecutive days ending on or just before the
 * reference date that contains at least one session. If neither today nor
 * yesterday has a session, the streak is 0.
 */
export function computeStreak(sessions, referenceDate = Date.now()) {
  if (sessions.length === 0) return 0;
  const days = new Set(sessions.map((s) => toIsoDay(s.timestamp)));
  const today = toIsoDay(referenceDate);
  const yesterday = toIsoDay(referenceDate - ONE_DAY_MS);
  if (!days.has(today) && !days.has(yesterday)) return 0;
  let cursor = days.has(today) ? referenceDate : referenceDate - ONE_DAY_MS;
  let streak = 0;
  while (days.has(toIsoDay(cursor))) {
    streak += 1;
    cursor -= ONE_DAY_MS;
  }
  return streak;
}

/**
 * Compare the trailing 7-day window ending at referenceDate to the prior
 * 7-day window. Percent change is signed; when the previous period is zero
 * and the current period is not, returns +100.
 */
export function computeWeekOverWeek(sessions, referenceDate = Date.now()) {
  const currentStart = referenceDate - 7 * ONE_DAY_MS;
  const previousStart = currentStart - 7 * ONE_DAY_MS;
  const current = { count: 0, minutes: 0, cost: 0 };
  const previous = { count: 0, minutes: 0, cost: 0 };
  for (const s of sessions) {
    const ts = s.timestamp;
    const minutes = numOrDefault(s.durationMinutes, 0);
    const cost = numOrDefault(s.cost, 0);
    if (ts > currentStart && ts <= referenceDate) {
      current.count += 1;
      current.minutes += minutes;
      current.cost += cost;
    } else if (ts > previousStart && ts <= currentStart) {
      previous.count += 1;
      previous.minutes += minutes;
      previous.cost += cost;
    }
  }
  const percentChange = (curr, prev) => {
    if (prev === 0) return curr === 0 ? 0 : 100;
    return ((curr - prev) / prev) * 100;
  };
  return {
    current,
    previous,
    percentChangeCount: percentChange(current.count, previous.count),
    percentChangeMinutes: percentChange(current.minutes, previous.minutes),
  };
}

/**
 * Return the top `limit` most-used tags sorted by count descending.
 */
export function topTags(sessions, limit = 5) {
  const counts = new Map();
  for (const s of sessions) {
    if (!Array.isArray(s.tags)) continue;
    for (const tag of s.tags) {
      if (typeof tag !== "string" || tag.length === 0) continue;
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}
