// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";

import { SoundStore, BUNDLE_FORMAT } from "../store.js";

let dbCounter = 0;
function makeDbName() {
  dbCounter += 1;
  return `test-soundboard-groups-${dbCounter}-${Date.now()}`;
}

function audioBlob(bytes = [0x49, 0x44, 0x33, 0x04], type = "audio/mpeg") {
  return new Blob([new Uint8Array(bytes)], { type });
}

async function blobBytes(blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

describe("sound groups", () => {
  it("stores a group on add and defaults to ungrouped", async () => {
    const store = new SoundStore(makeDbName());
    await store.init();

    await store.addSound("laugh", audioBlob(), { group: "memes" });
    await store.addSound("plain", audioBlob());

    const sounds = store.listSounds();
    expect(sounds[0].group).toBe("memes");
    expect(sounds[1].group).toBe("");
  });

  it("setGroup moves a sound and persists across reopen", async () => {
    const dbName = makeDbName();
    const store = new SoundStore(dbName);
    await store.init();
    const id = await store.addSound("laugh", audioBlob());

    await store.setGroup(id, "reactions");
    expect(store.listSounds()[0].group).toBe("reactions");

    store.dispose();
    const reopened = new SoundStore(dbName);
    await reopened.init();
    expect(reopened.listSounds()[0].group).toBe("reactions");
  });

  it("notifies onChange when a group changes", async () => {
    const store = new SoundStore(makeDbName());
    await store.init();
    const id = await store.addSound("laugh", audioBlob());
    let calls = 0;
    store.onChange(() => calls++);

    await store.setGroup(id, "memes");

    expect(calls).toBe(1);
  });
});

describe("bundle export / import", () => {
  it("round-trips sounds with names, groups, and audio bytes", async () => {
    const source = new SoundStore(makeDbName());
    await source.init();
    await source.addSound("air horn", audioBlob([1, 2, 3]), { group: "memes" });
    await source.addSound("hello", audioBlob([9, 8, 7, 6], "audio/wav"));

    const bundle = await source.exportBundle();
    expect(bundle.format).toBe(BUNDLE_FORMAT);
    expect(bundle.sounds).toHaveLength(2);

    // Bundles must be JSON-safe for file sharing.
    const parsed = JSON.parse(JSON.stringify(bundle));

    const target = new SoundStore(makeDbName());
    await target.init();
    const imported = await target.importBundle(parsed);

    expect(imported).toBe(2);
    const sounds = target.listSounds();
    expect(sounds.map((s) => s.name)).toEqual(["air horn", "hello"]);
    expect(sounds[0].group).toBe("memes");
    expect(sounds[1].mimeType).toBe("audio/wav");
    expect(await blobBytes(await target.getBlob(sounds[0].id))).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("exports only the requested group", async () => {
    const store = new SoundStore(makeDbName());
    await store.init();
    await store.addSound("laugh", audioBlob(), { group: "memes" });
    await store.addSound("gg", audioBlob(), { group: "gaming" });

    const bundle = await store.exportBundle({ group: "memes" });

    expect(bundle.sounds).toHaveLength(1);
    expect(bundle.sounds[0].name).toBe("laugh");
  });

  it("rejects a non-bundle object", async () => {
    const store = new SoundStore(makeDbName());
    await store.init();

    await expect(store.importBundle({ hello: "world" })).rejects.toThrow(/bundle/i);
  });

  it("skips malformed entries but imports the valid ones", async () => {
    const source = new SoundStore(makeDbName());
    await source.init();
    await source.addSound("good", audioBlob());
    const bundle = await source.exportBundle();
    bundle.sounds.push({ name: "broken", mimeType: "audio/mpeg", data: "%%%not-base64%%%" });

    const target = new SoundStore(makeDbName());
    await target.init();
    const imported = await target.importBundle(bundle);

    expect(imported).toBe(1);
    expect(target.listSounds().map((s) => s.name)).toEqual(["good"]);
  });
});

describe("v1 → v2 migration", () => {
  it("keeps sounds saved before the data store split", async () => {
    const dbName = makeDbName();
    // Hand-create a v1 database: audio bytes inline on the sound record.
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = () => req.result.createObjectStore("sounds", { keyPath: "id" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction("sounds", "readwrite");
      tx.objectStore("sounds").put({
        id: "s_old",
        name: "old clip",
        mimeType: "audio/mpeg",
        size: 3,
        createdAt: 1,
        data: new Uint8Array([1, 2, 3]).buffer,
      });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();

    const store = new SoundStore(dbName);
    await store.init();

    const sounds = store.listSounds();
    expect(sounds).toHaveLength(1);
    expect(sounds[0]).toMatchObject({ name: "old clip", group: "" });
    expect(await blobBytes(await store.getBlob("s_old"))).toEqual(new Uint8Array([1, 2, 3]));
  });
});
