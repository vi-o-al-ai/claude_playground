/**
 * Drives a whole playlist conversion: search, match, insert, one track at a
 * time. Any interruption (quota gone, token expired, user cancelled) stops
 * cleanly and reports where to pick the job back up.
 */
import { buildSearchQuery } from "./query.js";
import { pickBestMatch } from "./match.js";

const STOP_REASONS = {
  quotaExceeded: "quotaExceeded",
  dailyLimitExceeded: "quotaExceeded",
  rateLimitExceeded: "quotaExceeded",
  userRateLimitExceeded: "quotaExceeded",
  unauthorized: "unauthorized",
};

/**
 * Lines a result up for every track: whatever an earlier run finished, and a
 * `pending` placeholder for everything still to do.
 */
export function withPendingResults(tracks, previousResults = []) {
  return tracks.map((track, index) => {
    const previous = previousResults?.find((r) => r.index === index);
    return previous || { index, track, status: "pending" };
  });
}

export async function convertPlaylist({
  tracks,
  client,
  playlistTitle,
  playlistId,
  description = "",
  privacyStatus = "private",
  minScore = 0.5,
  candidatesPerTrack = 5,
  onProgress,
  signal,
  startIndex = 0,
  previousResults = [],
} = {}) {
  if (!Array.isArray(tracks) || tracks.length === 0) throw new Error("no tracks to convert");
  if (!playlistId && !playlistTitle) {
    throw new Error("a playlist title or an existing playlist id is required");
  }

  const results = withPendingResults(tracks, previousResults);

  let resolvedPlaylistId = playlistId;
  let playlistUrl = playlistId ? `https://www.youtube.com/playlist?list=${playlistId}` : "";
  if (!resolvedPlaylistId) {
    try {
      const created = await client.createPlaylist({
        title: playlistTitle,
        description,
        privacyStatus,
      });
      resolvedPlaylistId = created.playlistId;
      playlistUrl = created.url;
    } catch (error) {
      // Running out of quota or auth before the first track is still a stop the
      // caller can report and resume from, not an exception.
      const stop = STOP_REASONS[error?.reason];
      if (!stop) throw error;
      return {
        playlistId: undefined,
        playlistUrl: "",
        results,
        quotaUsed: client.quotaUsed,
        stoppedReason: stop,
        resumeIndex: startIndex,
        completed: false,
      };
    }
  }

  let stoppedReason = null;
  let index = startIndex;

  for (; index < tracks.length; index += 1) {
    if (signal?.aborted) {
      stoppedReason = "aborted";
      break;
    }

    const track = tracks[index];
    let result;
    try {
      result = await convertTrack({
        track,
        index,
        client,
        playlistId: resolvedPlaylistId,
        minScore,
        candidatesPerTrack,
      });
    } catch (error) {
      const stop = STOP_REASONS[error?.reason];
      if (stop) {
        stoppedReason = stop;
        break;
      }
      result = { index, track, status: "failed", error: error?.message || String(error) };
    }

    results[index] = result;
    onProgress?.({
      index,
      total: tracks.length,
      track,
      result,
      quotaUsed: client.quotaUsed,
      playlistId: resolvedPlaylistId,
    });
  }

  return {
    playlistId: resolvedPlaylistId,
    playlistUrl,
    results,
    quotaUsed: client.quotaUsed,
    stoppedReason,
    resumeIndex: stoppedReason ? index : tracks.length,
    completed: stoppedReason === null,
  };
}

async function convertTrack({ track, index, client, playlistId, minScore, candidatesPerTrack }) {
  const query = buildSearchQuery(track);
  const candidates = await client.searchVideos(query, { maxResults: candidatesPerTrack });

  if (candidates.length === 0) {
    return {
      index,
      track,
      query,
      status: "no-match",
      candidates: [],
      reason: "YouTube returned no videos",
    };
  }

  // One extra unit buys durations for every candidate, which is the strongest
  // signal we have for telling a song apart from an hour-long upload of it.
  const durations = await client.getVideoDurations(candidates.map((c) => c.videoId));
  const enriched = candidates.map((c) => ({ ...c, durationSec: durations.get(c.videoId) ?? null }));

  const best = pickBestMatch(track, enriched, { minScore });
  if (!best) {
    return {
      index,
      track,
      query,
      status: "no-match",
      candidates: enriched,
      reason: "no candidate was a confident enough match",
    };
  }

  await client.addToPlaylist(playlistId, best.video.videoId);
  return {
    index,
    track,
    query,
    status: "added",
    video: best.video,
    score: best.score,
    confidence: best.confidence,
    reasons: best.reasons,
    candidates: enriched,
    alternatives: best.alternatives,
  };
}
