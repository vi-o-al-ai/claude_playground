// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";

import { SoundStore, MAX_SOUND_BYTES, soundNameFromFile } from "../store.js";

// Track each test's DB so they don't collide.
let dbCounter = 0;
function makeDbName() {
  dbCounter += 1;
  return `test-soundboard-${dbCounter}-${Date.now()}`;
}

function audioBlob(bytes = [0x49, 0x44, 0x33, 0x04], type = "audio/mpeg") {
  return new Blob([new Uint8Array(bytes)], { type });
}

describe("SoundStore CRUD", () => {
  it("addSound stores a blob and listSounds returns its metadata", async () => {
    const store = new SoundStore(makeDbName());
    await store.init();

    const id = await store.addSound("air horn", audioBlob());

    expect(typeof id).toBe("string");
    const sounds = store.listSounds();
    expect(sounds).toHaveLength(1);
    expect(sounds[0]).toMatchObject({ id, name: "air horn", mimeType: "audio/mpeg" });
    expect(sounds[0].size).toBeGreaterThan(0);
  });

  it("persists sounds across store instances (revisit)", async () => {
    const dbName = makeDbName();
    const first = new SoundStore(dbName);
    await first.init();
    await first.addSound("bruh", audioBlob());
    first.dispose();

    const second = new SoundStore(dbName);
    await second.init();

    const sounds = second.listSounds();
    expect(sounds).toHaveLength(1);
    expect(sounds[0].name).toBe("bruh");
    const blob = await second.getBlob(sounds[0].id);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("lists sounds in insertion order", async () => {
    const store = new SoundStore(makeDbName());
    await store.init();

    await store.addSound("first", audioBlob());
    await store.addSound("second", audioBlob());
    await store.addSound("third", audioBlob());

    expect(store.listSounds().map((s) => s.name)).toEqual(["first", "second", "third"]);
  });

  it("renameSound changes the display name and persists it", async () => {
    const dbName = makeDbName();
    const store = new SoundStore(dbName);
    await store.init();
    const id = await store.addSound("old name", audioBlob());

    await store.renameSound(id, "new name");
    expect(store.listSounds()[0].name).toBe("new name");

    store.dispose();
    const reopened = new SoundStore(dbName);
    await reopened.init();
    expect(reopened.listSounds()[0].name).toBe("new name");
  });

  it("removeSound deletes the sound", async () => {
    const store = new SoundStore(makeDbName());
    await store.init();
    const id = await store.addSound("bye", audioBlob());

    await store.removeSound(id);

    expect(store.listSounds()).toHaveLength(0);
    expect(await store.getBlob(id)).toBeNull();
  });

  it("notifies onChange listeners on add/rename/remove", async () => {
    const store = new SoundStore(makeDbName());
    await store.init();
    let calls = 0;
    store.onChange(() => calls++);

    const id = await store.addSound("ping", audioBlob());
    await store.renameSound(id, "pong");
    await store.removeSound(id);

    expect(calls).toBe(3);
  });
});

describe("SoundStore validation", () => {
  it("rejects non-audio blobs", async () => {
    const store = new SoundStore(makeDbName());
    await store.init();

    const image = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
    await expect(store.addSound("nope", image)).rejects.toThrow(/audio/i);
  });

  it("rejects non-Blob values", async () => {
    const store = new SoundStore(makeDbName());
    await store.init();

    await expect(store.addSound("nope", "not a blob")).rejects.toThrow(/blob/i);
  });

  it("rejects blobs over the size limit", async () => {
    const store = new SoundStore(makeDbName());
    await store.init();

    const huge = new Blob([new Uint8Array(MAX_SOUND_BYTES + 1)], { type: "audio/mpeg" });
    await expect(store.addSound("too big", huge)).rejects.toThrow(/large/i);
  });

  it("falls back to 'untitled' for an empty name", async () => {
    const store = new SoundStore(makeDbName());
    await store.init();

    await store.addSound("   ", audioBlob());
    expect(store.listSounds()[0].name).toBe("untitled");
  });
});

describe("soundNameFromFile", () => {
  it("strips the extension and prettifies separators", () => {
    expect(soundNameFromFile("air-horn.mp3")).toBe("air horn");
    expect(soundNameFromFile("sad_trombone.wav")).toBe("sad trombone");
  });

  it("handles names with dots and no extension", () => {
    expect(soundNameFromFile("dr.dre.beat.ogg")).toBe("dr.dre.beat");
    expect(soundNameFromFile("clip")).toBe("clip");
  });

  it("returns 'untitled' for empty input", () => {
    expect(soundNameFromFile("")).toBe("untitled");
    expect(soundNameFromFile(undefined)).toBe("untitled");
  });
});
