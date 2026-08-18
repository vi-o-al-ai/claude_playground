/** Minimal YouTube Data API v3 client with built-in quota accounting. */
import { QUOTA_COSTS } from "./quota.js";
import { parseIsoDuration } from "./match.js";

const API_BASE = "https://www.googleapis.com/youtube/v3";
const DETAILS_BATCH_SIZE = 50;
const QUOTA_REASONS = new Set([
  "quotaExceeded",
  "dailyLimitExceeded",
  "rateLimitExceeded",
  "userRateLimitExceeded",
]);

export class YouTubeError extends Error {
  constructor(message, { status = 0, reason = "unknown" } = {}) {
    super(message);
    this.name = "YouTubeError";
    this.status = status;
    this.reason = reason;
  }

  /** True when waiting for the quota to reset is the only remedy. */
  get isQuota() {
    return QUOTA_REASONS.has(this.reason);
  }
}

/** URLSearchParams encodes spaces as "+", which the API search does not want. */
function encodeParams(params) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

export function createYouTubeClient({ accessToken, fetchImpl } = {}) {
  if (!accessToken) throw new Error("a YouTube access token is required");
  const doFetch = fetchImpl || ((...args) => globalThis.fetch(...args));

  const client = {
    quotaUsed: 0,

    async searchVideos(query, options = {}) {
      const maxResults = options.maxResults ?? 5;
      const url = `${API_BASE}/search?${encodeParams({
        part: "snippet",
        type: "video",
        videoCategoryId: options.musicOnly ? "10" : undefined,
        maxResults,
        q: query,
      })}`;
      const data = await request(url, { cost: QUOTA_COSTS.search });
      return (data.items || [])
        .filter((item) => item?.id?.videoId)
        .map((item) => ({
          videoId: item.id.videoId,
          title: item.snippet?.title ?? "",
          channelTitle: item.snippet?.channelTitle ?? "",
        }));
    },

    /** Durations are worth fetching: 1 unit buys up to 50 of them. */
    async getVideoDurations(ids) {
      const durations = new Map();
      const unique = [...new Set((ids || []).filter(Boolean))];
      for (let i = 0; i < unique.length; i += DETAILS_BATCH_SIZE) {
        const batch = unique.slice(i, i + DETAILS_BATCH_SIZE);
        const url = `${API_BASE}/videos?${encodeParams({ part: "contentDetails", id: batch.join(",") })}`;
        const data = await request(url, { cost: QUOTA_COSTS.videoDetails });
        for (const item of data.items || []) {
          durations.set(item.id, parseIsoDuration(item.contentDetails?.duration));
        }
      }
      return durations;
    },

    async createPlaylist({ title, description = "", privacyStatus = "private" } = {}) {
      if (!title) throw new Error("a playlist title is required");
      const url = `${API_BASE}/playlists?${encodeParams({ part: "snippet,status" })}`;
      const data = await request(url, {
        method: "POST",
        cost: QUOTA_COSTS.playlistCreate,
        body: { snippet: { title, description }, status: { privacyStatus } },
      });
      return { playlistId: data.id, url: `https://www.youtube.com/playlist?list=${data.id}` };
    },

    async addToPlaylist(playlistId, videoId) {
      const url = `${API_BASE}/playlistItems?${encodeParams({ part: "snippet" })}`;
      await request(url, {
        method: "POST",
        cost: QUOTA_COSTS.playlistInsert,
        body: {
          snippet: { playlistId, resourceId: { kind: "youtube#video", videoId } },
        },
      });
    },
  };

  async function request(url, { method = "GET", body, cost }) {
    // Charged up front: YouTube bills failed calls too.
    client.quotaUsed += cost;

    let response;
    try {
      response = await doFetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch (cause) {
      throw new YouTubeError(`Could not reach YouTube: ${cause.message}`, { reason: "network" });
    }

    let data;
    try {
      data = (await response.json()) ?? {};
    } catch {
      data = {};
    }

    if (!response.ok) {
      const apiError = data.error || {};
      const reason = apiError.errors?.[0]?.reason || "unknown";
      throw new YouTubeError(apiError.message || `YouTube request failed (${response.status})`, {
        status: response.status,
        reason: response.status === 401 ? "unauthorized" : reason,
      });
    }
    return data;
  }

  return client;
}
