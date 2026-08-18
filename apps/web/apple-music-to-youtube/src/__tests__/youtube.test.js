import { describe, it, expect, vi } from "vitest";
import { createYouTubeClient, YouTubeError, stopReasonFor } from "../youtube.js";

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function clientWith(responses) {
  const calls = [];
  const queue = [...responses];
  const fetchImpl = vi.fn(async (url, init) => {
    calls.push({ url, init });
    const next = queue.shift();
    if (!next) throw new Error(`unexpected fetch: ${url}`);
    return next;
  });
  return { client: createYouTubeClient({ accessToken: "tok", fetchImpl }), calls, fetchImpl };
}

describe("createYouTubeClient", () => {
  it("requires an access token", () => {
    expect(() => createYouTubeClient({ accessToken: "" })).toThrow(/access token/i);
  });

  it("starts with zero quota used", () => {
    expect(createYouTubeClient({ accessToken: "t" }).quotaUsed).toBe(0);
  });
});

describe("searchVideos", () => {
  it("sends an authorized video search and maps the results", async () => {
    const { client, calls } = clientWith([
      jsonResponse({
        items: [
          {
            id: { videoId: "v1" },
            snippet: { title: "Portishead - Roads", channelTitle: "Portishead - Topic" },
          },
        ],
      }),
    ]);

    const results = await client.searchVideos("Roads Portishead", { maxResults: 3 });

    expect(results).toEqual([
      { videoId: "v1", title: "Portishead - Roads", channelTitle: "Portishead - Topic" },
    ]);
    expect(calls[0].url).toContain("/search?");
    expect(calls[0].url).toContain("type=video");
    expect(calls[0].url).toContain("maxResults=3");
    expect(calls[0].url).toContain(encodeURIComponent("Roads Portishead"));
    expect(calls[0].init.headers.Authorization).toBe("Bearer tok");
  });

  it("charges 100 units", async () => {
    const { client } = clientWith([jsonResponse({ items: [] })]);
    await client.searchVideos("x");
    expect(client.quotaUsed).toBe(100);
  });

  it("returns an empty array when the API returns no items", async () => {
    const { client } = clientWith([jsonResponse({})]);
    expect(await client.searchVideos("x")).toEqual([]);
  });

  it("skips items that are not videos", async () => {
    const { client } = clientWith([
      jsonResponse({ items: [{ id: { channelId: "c1" }, snippet: {} }] }),
    ]);
    expect(await client.searchVideos("x")).toEqual([]);
  });
});

describe("getVideoDurations", () => {
  it("resolves durations in a single batched call costing 1 unit", async () => {
    const { client, calls } = clientWith([
      jsonResponse({
        items: [
          { id: "v1", contentDetails: { duration: "PT5M22S" } },
          { id: "v2", contentDetails: { duration: "PT3M" } },
        ],
      }),
    ]);

    const durations = await client.getVideoDurations(["v1", "v2"]);

    expect(durations.get("v1")).toBe(322);
    expect(durations.get("v2")).toBe(180);
    expect(client.quotaUsed).toBe(1);
    expect(calls[0].url).toContain("id=v1%2Cv2");
  });

  it("splits requests into batches of 50", async () => {
    const ids = Array.from({ length: 51 }, (_, i) => `v${i}`);
    const { client, fetchImpl } = clientWith([
      jsonResponse({ items: [] }),
      jsonResponse({ items: [] }),
    ]);
    await client.getVideoDurations(ids);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(client.quotaUsed).toBe(2);
  });

  it("costs nothing and calls nothing for an empty id list", async () => {
    const { client, fetchImpl } = clientWith([]);
    expect((await client.getVideoDurations([])).size).toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(client.quotaUsed).toBe(0);
  });
});

describe("createPlaylist", () => {
  it("posts a private playlist by default and returns its id and url", async () => {
    const { client, calls } = clientWith([jsonResponse({ id: "PL123" })]);
    const result = await client.createPlaylist({
      title: "My Mix",
      description: "from Apple Music",
    });

    expect(result).toEqual({
      playlistId: "PL123",
      url: "https://www.youtube.com/playlist?list=PL123",
    });
    expect(client.quotaUsed).toBe(50);
    expect(calls[0].init.method).toBe("POST");
    const body = JSON.parse(calls[0].init.body);
    expect(body.snippet).toMatchObject({ title: "My Mix", description: "from Apple Music" });
    expect(body.status.privacyStatus).toBe("private");
  });

  it("honours an explicit privacy status", async () => {
    const { client, calls } = clientWith([jsonResponse({ id: "PL1" })]);
    await client.createPlaylist({ title: "t", privacyStatus: "unlisted" });
    expect(JSON.parse(calls[0].init.body).status.privacyStatus).toBe("unlisted");
  });

  it("rejects an empty title", async () => {
    const { client } = clientWith([]);
    await expect(client.createPlaylist({ title: "" })).rejects.toThrow(/title/i);
  });
});

describe("addToPlaylist", () => {
  it("posts a playlistItem and charges 50 units", async () => {
    const { client, calls } = clientWith([jsonResponse({ id: "item1" })]);
    await client.addToPlaylist("PL123", "v1");

    expect(client.quotaUsed).toBe(50);
    const body = JSON.parse(calls[0].init.body);
    expect(body.snippet).toMatchObject({
      playlistId: "PL123",
      resourceId: { kind: "youtube#video", videoId: "v1" },
    });
  });
});

describe("error handling", () => {
  it("raises a quotaExceeded error on the daily limit", async () => {
    const { client } = clientWith([
      jsonResponse(
        { error: { code: 403, message: "quota", errors: [{ reason: "quotaExceeded" }] } },
        403,
      ),
    ]);
    await expect(client.searchVideos("x")).rejects.toMatchObject({
      name: "YouTubeError",
      reason: "quotaExceeded",
      status: 403,
    });
  });

  it("raises an unauthorized error when the token has expired", async () => {
    const { client } = clientWith([
      jsonResponse(
        { error: { code: 401, message: "Invalid Credentials", errors: [{ reason: "authError" }] } },
        401,
      ),
    ]);
    await expect(client.searchVideos("x")).rejects.toMatchObject({ reason: "unauthorized" });
  });

  it("wraps network failures rather than leaking them raw", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    const client = createYouTubeClient({ accessToken: "t", fetchImpl });
    await expect(client.searchVideos("x")).rejects.toMatchObject({
      name: "YouTubeError",
      reason: "network",
    });
  });

  it("still charges quota for a failed request, because YouTube does", async () => {
    const { client } = clientWith([
      jsonResponse({ error: { code: 403, errors: [{ reason: "forbidden" }] } }, 403),
    ]);
    await expect(client.searchVideos("x")).rejects.toBeInstanceOf(YouTubeError);
    expect(client.quotaUsed).toBe(100);
  });

  it("exposes the API message for display", async () => {
    const { client } = clientWith([
      jsonResponse(
        {
          error: {
            code: 404,
            message: "Playlist not found",
            errors: [{ reason: "playlistNotFound" }],
          },
        },
        404,
      ),
    ]);
    await expect(client.addToPlaylist("PLnope", "v1")).rejects.toThrow(/Playlist not found/);
  });
});

describe("stopReasonFor", () => {
  it("treats every quota-shaped reason as a quota stop", () => {
    for (const reason of [
      "quotaExceeded",
      "dailyLimitExceeded",
      "rateLimitExceeded",
      "userRateLimitExceeded",
    ]) {
      expect(stopReasonFor(new YouTubeError("x", { reason }))).toBe("quotaExceeded");
    }
  });

  it("recognises an expired sign-in", () => {
    expect(stopReasonFor(new YouTubeError("x", { status: 401, reason: "unauthorized" }))).toBe(
      "unauthorized",
    );
  });

  it("returns null for failures a run cannot be resumed from", () => {
    expect(stopReasonFor(new YouTubeError("x", { reason: "forbidden" }))).toBeNull();
    expect(stopReasonFor(new Error("boom"))).toBeNull();
    expect(stopReasonFor(null)).toBeNull();
  });

  it("agrees with the isQuota flag on the error itself", () => {
    expect(new YouTubeError("x", { reason: "quotaExceeded" }).isQuota).toBe(true);
    expect(new YouTubeError("x", { reason: "unauthorized" }).isQuota).toBe(false);
  });
});
