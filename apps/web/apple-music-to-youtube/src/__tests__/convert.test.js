import { describe, it, expect, vi } from "vitest";
import { convertPlaylist, withPendingResults } from "../convert.js";
import { YouTubeError } from "../youtube.js";

const tracks = [
  { title: "Roads", artist: "Portishead", durationSec: 322 },
  { title: "Glory Box", artist: "Portishead", durationSec: 305 },
];

function fakeClient(overrides = {}) {
  const client = {
    quotaUsed: 0,
    createPlaylist: vi.fn(async ({ title }) => ({
      playlistId: "PL1",
      url: `https://www.youtube.com/playlist?list=PL1#${title}`,
    })),
    searchVideos: vi.fn(async (query) => [
      {
        videoId: `vid-${query.split(" ")[0].toLowerCase()}`,
        title: query,
        channelTitle: "Portishead - Topic",
      },
    ]),
    getVideoDurations: vi.fn(async (ids) => new Map(ids.map((id) => [id, 322]))),
    addToPlaylist: vi.fn(async () => {}),
    ...overrides,
  };
  return client;
}

describe("convertPlaylist — happy path", () => {
  it("creates a playlist and adds a video for each track", async () => {
    const client = fakeClient();
    const out = await convertPlaylist({ tracks, client, playlistTitle: "Dummy" });

    expect(client.createPlaylist).toHaveBeenCalledWith(expect.objectContaining({ title: "Dummy" }));
    expect(client.addToPlaylist).toHaveBeenCalledTimes(2);
    expect(out.playlistId).toBe("PL1");
    expect(out.results.map((r) => r.status)).toEqual(["added", "added"]);
    expect(out.stoppedReason).toBeNull();
    expect(out.completed).toBe(true);
  });

  it("reports progress for every track", async () => {
    const onProgress = vi.fn();
    await convertPlaylist({ tracks, client: fakeClient(), playlistTitle: "Dummy", onProgress });

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress.mock.calls[0][0]).toMatchObject({
      index: 0,
      total: 2,
      result: { status: "added" },
    });
  });

  it("resolves durations for the search candidates before matching", async () => {
    const client = fakeClient();
    await convertPlaylist({ tracks, client, playlistTitle: "Dummy" });
    expect(client.getVideoDurations).toHaveBeenCalledTimes(2);
  });

  it("adds to an existing playlist instead of creating one when given an id", async () => {
    const client = fakeClient();
    const out = await convertPlaylist({ tracks, client, playlistId: "PLexisting" });

    expect(client.createPlaylist).not.toHaveBeenCalled();
    expect(out.playlistId).toBe("PLexisting");
    expect(client.addToPlaylist).toHaveBeenCalledWith("PLexisting", expect.any(String));
  });
});

describe("convertPlaylist — matching outcomes", () => {
  it("records no-match when search comes back empty", async () => {
    const client = fakeClient({ searchVideos: vi.fn(async () => []) });
    const out = await convertPlaylist({ tracks: [tracks[0]], client, playlistTitle: "x" });

    expect(out.results[0].status).toBe("no-match");
    expect(client.addToPlaylist).not.toHaveBeenCalled();
  });

  it("records no-match when nothing clears the confidence floor", async () => {
    const client = fakeClient({
      searchVideos: vi.fn(async () => [
        { videoId: "junk", title: "Sourdough tutorial part 4", channelTitle: "Bread Weekly" },
      ]),
      getVideoDurations: vi.fn(async (ids) => new Map(ids.map((id) => [id, 1800]))),
    });
    const out = await convertPlaylist({
      tracks: [tracks[0]],
      client,
      playlistTitle: "x",
      minScore: 0.5,
    });

    expect(out.results[0].status).toBe("no-match");
    expect(out.results[0].candidates.length).toBeGreaterThan(0);
  });

  it("keeps the match score and confidence on each result", async () => {
    const out = await convertPlaylist({
      tracks: [tracks[0]],
      client: fakeClient(),
      playlistTitle: "x",
    });
    expect(out.results[0].score).toBeGreaterThan(0);
    expect(["high", "medium", "low"]).toContain(out.results[0].confidence);
  });

  it("marks a track failed but keeps going when a single insert fails", async () => {
    let call = 0;
    const client = fakeClient({
      addToPlaylist: vi.fn(async () => {
        call += 1;
        if (call === 1) {
          throw new YouTubeError("boom", { status: 409, reason: "conflict" });
        }
      }),
    });
    const out = await convertPlaylist({ tracks, client, playlistTitle: "x" });

    expect(out.results.map((r) => r.status)).toEqual(["failed", "added"]);
    expect(out.results[0].error).toMatch(/boom/);
    expect(out.completed).toBe(true);
  });
});

describe("convertPlaylist — interruptions", () => {
  it("stops on quota exhaustion and leaves the rest pending", async () => {
    const client = fakeClient({
      searchVideos: vi.fn(async (query) => {
        if (query.startsWith("Glory")) {
          throw new YouTubeError("quota", { status: 403, reason: "quotaExceeded" });
        }
        return [{ videoId: "v1", title: query, channelTitle: "Portishead - Topic" }];
      }),
    });
    const out = await convertPlaylist({ tracks, client, playlistTitle: "x" });

    expect(out.stoppedReason).toBe("quotaExceeded");
    expect(out.completed).toBe(false);
    expect(out.results.map((r) => r.status)).toEqual(["added", "pending"]);
    expect(out.resumeIndex).toBe(1);
  });

  it("stops when the access token expires mid-run", async () => {
    const client = fakeClient({
      searchVideos: vi.fn(async () => {
        throw new YouTubeError("expired", { status: 401, reason: "unauthorized" });
      }),
    });
    const out = await convertPlaylist({ tracks, client, playlistTitle: "x" });

    expect(out.stoppedReason).toBe("unauthorized");
    expect(out.resumeIndex).toBe(0);
  });

  it("stops promptly when aborted", async () => {
    const controller = new AbortController();
    const client = fakeClient({
      searchVideos: vi.fn(async (query) => {
        controller.abort();
        return [{ videoId: "v1", title: query, channelTitle: "Portishead - Topic" }];
      }),
    });
    const out = await convertPlaylist({
      tracks,
      client,
      playlistTitle: "x",
      signal: controller.signal,
    });

    expect(out.stoppedReason).toBe("aborted");
    expect(out.results[1].status).toBe("pending");
  });

  it("resumes from a given index without redoing finished work", async () => {
    const client = fakeClient();
    const out = await convertPlaylist({
      tracks,
      client,
      playlistId: "PL1",
      startIndex: 1,
      previousResults: [{ index: 0, track: tracks[0], status: "added", video: { videoId: "old" } }],
    });

    expect(client.searchVideos).toHaveBeenCalledTimes(1);
    expect(out.results).toHaveLength(2);
    expect(out.results[0].video.videoId).toBe("old");
    expect(out.results[1].status).toBe("added");
  });
});

describe("convertPlaylist — bad input", () => {
  it("rejects an empty track list", async () => {
    await expect(
      convertPlaylist({ tracks: [], client: fakeClient(), playlistTitle: "x" }),
    ).rejects.toThrow(/no tracks/i);
  });

  it("requires either a playlist title or an existing playlist id", async () => {
    await expect(convertPlaylist({ tracks, client: fakeClient() })).rejects.toThrow(/playlist/i);
  });
});

describe("convertPlaylist — playlist creation failures", () => {
  function failingCreate(reason) {
    return fakeClient({
      createPlaylist: vi.fn(async () => {
        throw new YouTubeError("cannot create", {
          status: reason === "unauthorized" ? 401 : 403,
          reason,
        });
      }),
    });
  }

  it("turns a quota failure while creating the playlist into a resumable stop", async () => {
    const client = failingCreate("quotaExceeded");
    const out = await convertPlaylist({ tracks, client, playlistTitle: "x" });

    expect(out.stoppedReason).toBe("quotaExceeded");
    expect(out.completed).toBe(false);
    expect(out.resumeIndex).toBe(0);
    expect(out.results.every((r) => r.status === "pending")).toBe(true);
    expect(client.searchVideos).not.toHaveBeenCalled();
  });

  it("does the same when the token has already expired", async () => {
    const out = await convertPlaylist({
      tracks,
      client: failingCreate("unauthorized"),
      playlistTitle: "x",
    });
    expect(out.stoppedReason).toBe("unauthorized");
    expect(out.resumeIndex).toBe(0);
  });

  it("still throws on a creation failure nothing can be resumed from", async () => {
    const client = failingCreate("forbidden");
    await expect(convertPlaylist({ tracks, client, playlistTitle: "x" })).rejects.toThrow(
      /cannot create/,
    );
  });
});

describe("withPendingResults", () => {
  it("marks every unattempted track pending", () => {
    expect(withPendingResults(tracks, [])).toEqual([
      { index: 0, track: tracks[0], status: "pending" },
      { index: 1, track: tracks[1], status: "pending" },
    ]);
  });

  it("keeps results carried over from an earlier run", () => {
    const previous = [{ index: 1, track: tracks[1], status: "added", video: { videoId: "old" } }];
    const merged = withPendingResults(tracks, previous);
    expect(merged[0].status).toBe("pending");
    expect(merged[1].video.videoId).toBe("old");
  });

  it("tolerates a missing previous-results list", () => {
    expect(withPendingResults(tracks).map((r) => r.status)).toEqual(["pending", "pending"]);
  });
});
