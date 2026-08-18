/**
 * YouTube Data API v3 quota accounting.
 *
 * A project gets 10,000 units a day by default. A search costs 100 units and
 * a playlist insert 50, so a conversion run is dominated by per-track cost —
 * roughly 65 tracks before the quota is gone. The UI leans on these numbers
 * to warn the user before they start rather than half way through.
 */

export const QUOTA_COSTS = {
  search: 100,
  videoDetails: 1,
  playlistCreate: 50,
  playlistInsert: 50,
};

export const DAILY_QUOTA_UNITS = 10000;

const PER_TRACK = QUOTA_COSTS.search + QUOTA_COSTS.videoDetails + QUOTA_COSTS.playlistInsert;

/** Units a run of `trackCount` tracks will consume. */
export function estimateQuota(trackCount, options = {}) {
  const count = Number(trackCount);
  if (!Number.isFinite(count) || count < 0) throw new Error("track count must be zero or more");
  const createPlaylist = options.createPlaylist !== false;
  const setup = createPlaylist && count > 0 ? QUOTA_COSTS.playlistCreate : 0;
  return setup + count * PER_TRACK;
}

/** How many tracks fit inside a unit budget. */
export function maxTracksWithin(units, options = {}) {
  const createPlaylist = options.createPlaylist !== false;
  const budget = Number(units) - (createPlaylist ? QUOTA_COSTS.playlistCreate : 0);
  if (!Number.isFinite(budget) || budget < PER_TRACK) return 0;
  return Math.floor(budget / PER_TRACK);
}

export function formatQuota(units) {
  return Number(units || 0).toLocaleString("en-US");
}
