// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

import { mount } from "../ui.js";

function stubStore(sounds = []) {
  const listeners = new Set();
  for (const sound of sounds) sound.group ??= "";
  return {
    listSounds: () => sounds,
    getBlob: vi.fn(async () => new Blob([new Uint8Array([1])], { type: "audio/mpeg" })),
    addSound: vi.fn(async () => "new-id"),
    renameSound: vi.fn(async () => {}),
    removeSound: vi.fn(async () => {}),
    setGroup: vi.fn(async () => {}),
    exportBundle: vi.fn(async () => ({ format: "soundboard-bundle", version: 1, sounds: [] })),
    importBundle: vi.fn(async () => 0),
    onChange: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    _emit: () => listeners.forEach((cb) => cb()),
  };
}

function stubPlayer() {
  return { play: vi.fn(async () => {}), stopAll: vi.fn(), setOutput: vi.fn(), setMonitor: vi.fn() };
}

describe("soundboard UI", () => {
  it("renders an empty state when there are no sounds", () => {
    const root = document.createElement("div");
    mount(root, { store: stubStore(), player: stubPlayer() });

    expect(root.querySelector(".sound-grid")).not.toBeNull();
    expect(root.textContent).toMatch(/no sounds yet/i);
  });

  it("renders a pad per sound with its name and hotkey", () => {
    const root = document.createElement("div");
    const sounds = [
      { id: "a", name: "air horn", mimeType: "audio/mpeg", size: 100 },
      { id: "b", name: "bruh", mimeType: "audio/mpeg", size: 200 },
    ];
    mount(root, { store: stubStore(sounds), player: stubPlayer() });

    const pads = root.querySelectorAll(".sound-pad");
    expect(pads).toHaveLength(2);
    expect(pads[0].textContent).toContain("air horn");
    expect(pads[0].textContent).toContain("1");
    expect(pads[1].textContent).toContain("2");
  });

  it("plays a sound when its pad is clicked", async () => {
    const root = document.createElement("div");
    const store = stubStore([{ id: "a", name: "air horn", mimeType: "audio/mpeg", size: 100 }]);
    const player = stubPlayer();
    mount(root, { store, player });

    root.querySelector(".sound-pad").click();
    await Promise.resolve();

    expect(player.play).toHaveBeenCalledWith("a", expect.anything());
  });

  it("re-renders the grid when the store changes", () => {
    const root = document.createElement("div");
    const sounds = [];
    const store = stubStore(sounds);
    mount(root, { store, player: stubPlayer() });
    expect(root.querySelectorAll(".sound-pad")).toHaveLength(0);

    sounds.push({ id: "a", name: "new sound", mimeType: "audio/mpeg", size: 10 });
    store._emit();

    expect(root.querySelectorAll(".sound-pad")).toHaveLength(1);
  });

  it("plays sounds via number-key hotkeys", async () => {
    const root = document.createElement("div");
    const store = stubStore([{ id: "a", name: "air horn", mimeType: "audio/mpeg", size: 100 }]);
    const player = stubPlayer();
    mount(root, { store, player });

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
    await Promise.resolve();

    expect(player.play).toHaveBeenCalledWith("a", expect.anything());
  });

  it("has an add-sound file input restricted to audio", () => {
    const root = document.createElement("div");
    mount(root, { store: stubStore(), player: stubPlayer() });

    const input = root.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    expect(input.accept).toContain("audio");
  });

  it("renders group tabs and filters pads by the active group", () => {
    const root = document.createElement("div");
    const store = stubStore([
      { id: "a", name: "laugh", group: "memes", mimeType: "audio/mpeg", size: 1 },
      { id: "b", name: "gg", group: "gaming", mimeType: "audio/mpeg", size: 1 },
      { id: "c", name: "plain", mimeType: "audio/mpeg", size: 1 },
    ]);
    mount(root, { store, player: stubPlayer() });

    const tabs = [...root.querySelectorAll(".sb-group-tab")].map((t) => t.textContent);
    expect(tabs).toEqual(["All", "gaming", "memes"]);

    [...root.querySelectorAll(".sb-group-tab")].find((t) => t.textContent === "memes").click();

    const names = [...root.querySelectorAll(".sound-pad-name")].map((n) => n.textContent);
    expect(names).toEqual(["laugh"]);
  });

  it("filters pads by the search box", () => {
    const root = document.createElement("div");
    const store = stubStore([
      { id: "a", name: "air horn", mimeType: "audio/mpeg", size: 1 },
      { id: "b", name: "bruh", mimeType: "audio/mpeg", size: 1 },
    ]);
    mount(root, { store, player: stubPlayer() });

    const search = root.querySelector("#sound-search");
    search.value = "horn";
    search.dispatchEvent(new Event("input"));

    const names = [...root.querySelectorAll(".sound-pad-name")].map((n) => n.textContent);
    expect(names).toEqual(["air horn"]);
  });

  it("hotkeys target the filtered view, not the full library", async () => {
    const root = document.createElement("div");
    const store = stubStore([
      { id: "a", name: "laugh", group: "memes", mimeType: "audio/mpeg", size: 1 },
      { id: "b", name: "gg", group: "gaming", mimeType: "audio/mpeg", size: 1 },
    ]);
    const player = stubPlayer();
    mount(root, { store, player });

    [...root.querySelectorAll(".sb-group-tab")].find((t) => t.textContent === "gaming").click();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
    await Promise.resolve();

    expect(player.play).toHaveBeenCalledWith("b", expect.anything());
  });

  it("has export and import controls", () => {
    const root = document.createElement("div");
    mount(root, { store: stubStore(), player: stubPlayer() });

    expect(root.querySelector("#export-sounds")).not.toBeNull();
    const importInput = root.querySelector("#import-file-input");
    expect(importInput).not.toBeNull();
    expect(importInput.accept).toContain("json");
  });

  it("disables the mic passthrough toggle until a routable device is chosen", () => {
    const root = document.createElement("div");
    mount(root, { store: stubStore(), player: stubPlayer() });

    const toggle = root.querySelector("#mic-toggle");
    expect(toggle).not.toBeNull();
    expect(toggle.disabled).toBe(true);
  });

  it("has a stop-all control wired to the player", () => {
    const root = document.createElement("div");
    const player = stubPlayer();
    mount(root, { store: stubStore(), player });

    root.querySelector("#stop-all").click();

    expect(player.stopAll).toHaveBeenCalled();
  });
});
