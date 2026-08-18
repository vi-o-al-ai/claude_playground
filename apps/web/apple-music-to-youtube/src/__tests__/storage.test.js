import { describe, it, expect, beforeEach } from "vitest";
import { loadSettings, saveSettings, saveJob, loadJob, clearJob } from "../storage.js";

function memoryStore() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    _data: data,
  };
}

let store;
beforeEach(() => {
  store = memoryStore();
});

describe("settings", () => {
  it("returns defaults when nothing is stored", () => {
    expect(loadSettings(store)).toEqual({
      clientId: "",
      privacyStatus: "private",
      order: "title-artist",
    });
  });

  it("round-trips saved settings", () => {
    saveSettings(store, { clientId: "abc.apps.googleusercontent.com", privacyStatus: "unlisted" });
    expect(loadSettings(store)).toMatchObject({
      clientId: "abc.apps.googleusercontent.com",
      privacyStatus: "unlisted",
    });
  });

  it("never persists an access token", () => {
    saveSettings(store, { clientId: "abc", accessToken: "secret-token" });
    expect(JSON.stringify([...store._data.values()])).not.toContain("secret-token");
  });

  it("falls back to defaults on corrupt json", () => {
    store.setItem("apple-music-to-youtube:settings", "{not json");
    expect(loadSettings(store).clientId).toBe("");
  });
});

describe("job state", () => {
  const job = {
    playlistId: "PL1",
    playlistUrl: "https://www.youtube.com/playlist?list=PL1",
    resumeIndex: 3,
    tracks: [{ title: "Roads", artist: "Portishead" }],
    results: [{ index: 0, status: "added" }],
  };

  it("round-trips a job", () => {
    saveJob(store, job);
    expect(loadJob(store)).toMatchObject({ playlistId: "PL1", resumeIndex: 3 });
  });

  it("returns null when there is no job", () => {
    expect(loadJob(store)).toBeNull();
  });

  it("clears a job", () => {
    saveJob(store, job);
    clearJob(store);
    expect(loadJob(store)).toBeNull();
  });

  it("does not persist the per-candidate search data the UI never reads", () => {
    saveJob(store, {
      ...job,
      results: [
        {
          index: 0,
          status: "added",
          video: { videoId: "v1", title: "Roads" },
          candidates: Array.from({ length: 5 }, (_, i) => ({ videoId: `c${i}`, title: "junk" })),
          alternatives: [{ video: { videoId: "c1" }, score: 0.4 }],
        },
      ],
    });

    const raw = store.getItem("apple-music-to-youtube:job");
    expect(raw).not.toContain("candidates");
    expect(raw).not.toContain("alternatives");
    expect(loadJob(store).results[0]).toMatchObject({ status: "added", video: { videoId: "v1" } });
  });

  it("returns null rather than throwing on corrupt job data", () => {
    store.setItem("apple-music-to-youtube:job", "]]not json[[");
    expect(loadJob(store)).toBeNull();
  });

  it("survives a storage backend that throws (private browsing)", () => {
    const hostile = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    expect(() => saveJob(hostile, job)).not.toThrow();
    expect(loadJob(hostile)).toBeNull();
    expect(loadSettings(hostile).clientId).toBe("");
  });
});
