// @vitest-environment jsdom
/**
 * Integration cover for the UI wiring in main.js — the one module whose logic
 * the per-module specs cannot reach. Drives the real index.html markup with a
 * stubbed YouTube API and a stubbed Google Identity Services client.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const indexHtml = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../index.html"),
  "utf8",
);
const bodyMarkup = indexHtml
  .match(/<body>([\s\S]*)<\/body>/)[1]
  .replace(/<script[\s\S]*?<\/script>/g, "");

const CLIENT_ID = "123-abc.apps.googleusercontent.com";
const PLAYLIST = [
  "Roads - Portishead",
  "Glory Box - Portishead",
  "Wandering Star - Portishead",
].join("\n");

const $ = (id) => document.getElementById(id);
const json = (body) => ({ ok: true, status: 200, json: async () => body });

/** Answers every YouTube endpoint the conversion touches with a clean match. */
function stubYouTubeApi() {
  return vi.fn(async (url) => {
    if (url.includes("/playlists?")) return json({ id: "PL1" });
    if (url.includes("/search?")) {
      const query = decodeURIComponent(url.split("q=")[1].split("&")[0]);
      return json({
        items: [
          {
            id: { videoId: `vid-${query.split("%20")[0]}` },
            snippet: { title: query, channelTitle: "Portishead - Topic" },
          },
        ],
      });
    }
    if (url.includes("/videos?")) {
      const ids = decodeURIComponent(url.split("id=")[1].split("&")[0]).split(",");
      return json({ items: ids.map((id) => ({ id, contentDetails: { duration: "PT5M22S" } })) });
    }
    if (url.includes("/playlistItems?")) return json({ id: "item" });
    throw new Error(`unexpected request: ${url}`);
  });
}

function stubGoogleIdentity() {
  return {
    accounts: {
      oauth2: {
        initTokenClient: (config) => ({
          requestAccessToken: () =>
            config.callback({ access_token: "test-token", expires_in: 3600 }),
        }),
      },
    },
  };
}

let jobWrites;

async function bootApp() {
  document.body.innerHTML = bodyMarkup;
  vi.resetModules();
  await import("../main.js");
}

async function importAndConnect() {
  await bootApp();
  $("client-id").value = CLIENT_ID;
  $("client-id").dispatchEvent(new Event("change"));
  $("playlist-text").value = PLAYLIST;
  $("playlist-text").dispatchEvent(new Event("input"));
  $("connect-btn").click();
  await vi.waitFor(() => expect($("connect-state").textContent).toMatch(/connected/i));
}

beforeEach(() => {
  localStorage.clear();
  jobWrites = [];
  const write = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function setItemSpy(key, value) {
    if (key === "apple-music-to-youtube:job") jobWrites.push(JSON.parse(value));
    return write.call(this, key, value);
  });
  globalThis.fetch = stubYouTubeApi();
  window.google = stubGoogleIdentity();
});

afterEach(() => {
  vi.restoreAllMocks();
  delete window.google;
});

describe("import step", () => {
  it("parses pasted lines into a preview table", async () => {
    await bootApp();
    $("playlist-text").value = PLAYLIST;
    $("playlist-text").dispatchEvent(new Event("input"));

    expect($("import-summary").textContent).toMatch(/3/);
    expect($("import-preview").querySelectorAll("tbody tr")).toHaveLength(3);
  });

  it("keeps the convert button locked until YouTube is connected", async () => {
    await bootApp();
    $("playlist-text").value = PLAYLIST;
    $("playlist-text").dispatchEvent(new Event("input"));

    expect($("convert-btn").disabled).toBe(true);
  });
});

describe("conversion run", () => {
  it("adds every track and links the finished playlist", async () => {
    await importAndConnect();
    $("convert-btn").click();

    await vi.waitFor(() => expect($("results-table").textContent).toContain("Wandering Star"));
    const statuses = [...$("results-table").querySelectorAll("tbody tr")].map((tr) =>
      tr.children[2].textContent.trim(),
    );

    expect(statuses).toEqual(["added", "added", "added"]);
    expect($("results-summary").innerHTML).toContain("playlist?list=PL1");
  });

  // The saved job is the only record of work already paid for in quota, so a
  // later tick must never demote an earlier track back to pending.
  it("never regresses an already-converted track in the saved job", async () => {
    await importAndConnect();
    $("convert-btn").click();
    await vi.waitFor(() => expect(jobWrites).toHaveLength(3));

    const addedPerWrite = jobWrites.map(
      (job) => job.results.filter((r) => r.status === "added").length,
    );
    expect(addedPerWrite).toEqual([1, 2, 3]);
    expect(jobWrites.at(-1).resumeIndex).toBe(3);
  });

  it("clears the saved job once the run completes", async () => {
    await importAndConnect();
    $("convert-btn").click();

    await vi.waitFor(() => expect($("results-table").textContent).toContain("Wandering Star"));
    expect(localStorage.getItem("apple-music-to-youtube:job")).toBeNull();
  });
});
