// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { AssetStore } from "../asset-store.js";

// Track each test's DB so they don't collide.
let dbCounter = 0;
function makeStore() {
  dbCounter += 1;
  return new AssetStore(`test-splendor-art-${dbCounter}-${Date.now()}`);
}

function pngBlob(bytes = [0x89, 0x50, 0x4e, 0x47]) {
  return new Blob([new Uint8Array(bytes)], { type: "image/png" });
}

// jsdom does not implement URL.createObjectURL for Blobs. Stub it.
beforeEach(() => {
  let urlCounter = 0;
  globalThis.URL.createObjectURL = vi.fn(() => `blob:mock-${++urlCounter}`);
  globalThis.URL.revokeObjectURL = vi.fn();
});

describe("AssetStore asset CRUD", () => {
  it("addAsset stores a blob and listAssets returns it", async () => {
    const store = makeStore();
    await store.init();

    const id = await store.addAsset("dragon.png", pngBlob());
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);

    const list = await store.listAssets();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(id);
    expect(list[0].name).toBe("dragon.png");
    expect(list[0].mimeType).toBe("image/png");
    expect(list[0].hideDefaultHud).toBe(false);
  });

  it("getAssetBlob returns the stored blob", async () => {
    const store = makeStore();
    await store.init();

    const original = pngBlob([1, 2, 3, 4, 5]);
    const id = await store.addAsset("a.png", original);

    const blob = await store.getAssetBlob(id);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/png");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(Array.from(bytes)).toEqual([1, 2, 3, 4, 5]);
  });

  it("rejects non-image MIME types", async () => {
    const store = makeStore();
    await store.init();

    const textBlob = new Blob(["hello"], { type: "text/plain" });
    await expect(store.addAsset("bad.txt", textBlob)).rejects.toThrow(/image/i);
  });

  it("removeAsset deletes the asset and clears dependent mappings", async () => {
    const store = makeStore();
    await store.init();

    const id = await store.addAsset("a.png", pngBlob());
    store.setMapping("card:t1:0", id);
    expect(store.getMapping("card:t1:0")).toBe(id);

    await store.removeAsset(id);
    expect(await store.listAssets()).toHaveLength(0);
    expect(store.getMapping("card:t1:0")).toBe(null);
  });

  it("updateAsset can rename and toggle hideDefaultHud", async () => {
    const store = makeStore();
    await store.init();

    const id = await store.addAsset("original.png", pngBlob());
    await store.updateAsset(id, { name: "renamed.png", hideDefaultHud: true });

    const [entry] = await store.listAssets();
    expect(entry.name).toBe("renamed.png");
    expect(entry.hideDefaultHud).toBe(true);
  });
});

describe("AssetStore mappings", () => {
  it("setMapping / getMapping round-trip and null clears", async () => {
    const store = makeStore();
    await store.init();

    const id = await store.addAsset("a.png", pngBlob());
    store.setMapping("card:t1:5", id);
    expect(store.getMapping("card:t1:5")).toBe(id);

    store.setMapping("card:t1:5", null);
    expect(store.getMapping("card:t1:5")).toBe(null);
  });

  it("getAllMappings returns all set mappings", async () => {
    const store = makeStore();
    await store.init();

    const a = await store.addAsset("a.png", pngBlob());
    const b = await store.addAsset("b.png", pngBlob());
    store.setMapping("card:t1:0", a);
    store.setMapping("bg:body", b);

    const all = store.getAllMappings();
    expect(all).toEqual({ "card:t1:0": a, "bg:body": b });
  });

  it("getUrlForPiece returns null for unmapped pieces", async () => {
    const store = makeStore();
    await store.init();
    expect(store.getUrlForPiece("card:t1:0")).toBe(null);
  });

  it("getUrlForPiece returns a cached URL for mapped pieces", async () => {
    const store = makeStore();
    await store.init();

    const id = await store.addAsset("a.png", pngBlob());
    store.setMapping("card:t1:0", id);

    const url1 = store.getUrlForPiece("card:t1:0");
    const url2 = store.getUrlForPiece("card:t1:0");
    expect(url1).toBeTruthy();
    expect(url1).toBe(url2); // cached
  });

  it("removeAsset revokes the cached object URL", async () => {
    const store = makeStore();
    await store.init();

    const id = await store.addAsset("a.png", pngBlob());
    store.setMapping("card:t1:0", id);
    const url = store.getUrlForPiece("card:t1:0");
    expect(url).toBeTruthy();

    await store.removeAsset(id);
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith(url);
  });

  it("getHideHudForPiece reflects the asset's hideDefaultHud flag", async () => {
    const store = makeStore();
    await store.init();

    const id = await store.addAsset("a.png", pngBlob(), { hideDefaultHud: true });
    store.setMapping("card:t1:0", id);
    expect(store.getHideHudForPiece("card:t1:0")).toBe(true);
    expect(store.getHideHudForPiece("card:t1:1")).toBe(false);
  });
});

describe("AssetStore bundle export / import", () => {
  it("exportBundle returns a JSON-serializable object with correct shape", async () => {
    const store = makeStore();
    await store.init();

    const id = await store.addAsset("a.png", pngBlob([1, 2, 3]));
    store.setMapping("card:t1:0", id);

    const bundle = await store.exportBundle();
    expect(bundle.format).toBe("splendor-art-bundle");
    expect(bundle.version).toBe(1);
    expect(typeof bundle.exportedAt).toBe("string");
    expect(bundle.assets).toHaveLength(1);
    expect(bundle.assets[0].id).toBe(id);
    expect(bundle.assets[0].name).toBe("a.png");
    expect(bundle.assets[0].mimeType).toBe("image/png");
    expect(bundle.assets[0].data).toMatch(/^data:image\/png;base64,/);
    expect(bundle.mapping).toEqual({ "card:t1:0": id });

    // Should be round-trippable through JSON.
    const roundTripped = JSON.parse(JSON.stringify(bundle));
    expect(roundTripped).toEqual(bundle);
  });

  it("importBundle merges assets and mappings by default", async () => {
    const storeA = makeStore();
    await storeA.init();
    const id = await storeA.addAsset("a.png", pngBlob([9, 9, 9]));
    storeA.setMapping("card:t1:0", id);
    const bundle = await storeA.exportBundle();

    const storeB = makeStore();
    await storeB.init();
    const existingId = await storeB.addAsset("existing.png", pngBlob());

    await storeB.importBundle(bundle);

    const list = await storeB.listAssets();
    expect(list).toHaveLength(2); // existing + imported
    const names = list.map((a) => a.name).sort();
    expect(names).toEqual(["a.png", "existing.png"]);

    // Imported mapping points to the imported asset (not necessarily same id).
    const mappedId = storeB.getMapping("card:t1:0");
    expect(mappedId).toBeTruthy();
    expect(mappedId).not.toBe(existingId);
  });

  it("importBundle with replace:true wipes existing state first", async () => {
    const storeA = makeStore();
    await storeA.init();
    const id = await storeA.addAsset("a.png", pngBlob());
    storeA.setMapping("card:t1:0", id);
    const bundle = await storeA.exportBundle();

    const storeB = makeStore();
    await storeB.init();
    await storeB.addAsset("existing.png", pngBlob());
    storeB.setMapping("card:t1:1", "will-go-away");

    await storeB.importBundle(bundle, { replace: true });

    const list = await storeB.listAssets();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("a.png");
    expect(storeB.getMapping("card:t1:0")).toBeTruthy();
    expect(storeB.getMapping("card:t1:1")).toBe(null);
  });

  it("importBundle tolerates unknown asset refs in mapping", async () => {
    const store = makeStore();
    await store.init();

    const bogus = {
      format: "splendor-art-bundle",
      version: 1,
      assets: [],
      mapping: { "card:t1:0": "nonexistent" },
    };
    await store.importBundle(bogus);
    expect(store.getMapping("card:t1:0")).toBe(null);
  });

  it("clearAll removes assets and mappings", async () => {
    const store = makeStore();
    await store.init();

    const id = await store.addAsset("a.png", pngBlob());
    store.setMapping("card:t1:0", id);

    await store.clearAll();
    expect(await store.listAssets()).toHaveLength(0);
    expect(store.getMapping("card:t1:0")).toBe(null);
  });
});

describe("AssetStore events", () => {
  it("onChange fires on add, remove, mapping change, and clear", async () => {
    const store = makeStore();
    await store.init();

    const listener = vi.fn();
    store.onChange(listener);

    const id = await store.addAsset("a.png", pngBlob());
    expect(listener).toHaveBeenCalledTimes(1);

    store.setMapping("card:t1:0", id);
    expect(listener).toHaveBeenCalledTimes(2);

    await store.removeAsset(id);
    expect(listener).toHaveBeenCalledTimes(3);

    await store.clearAll();
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it("unsubscribe stops events", async () => {
    const store = makeStore();
    await store.init();

    const listener = vi.fn();
    const unsubscribe = store.onChange(listener);
    unsubscribe();

    await store.addAsset("a.png", pngBlob());
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("AssetStore online overlay", () => {
  it("applyOverlayBundle makes overlay pieces win over local mappings", async () => {
    const store = makeStore();
    await store.init();

    const local = await store.addAsset("local.png", pngBlob());
    store.setMapping("card:t1:0", local);
    const localUrl = store.getUrlForPiece("card:t1:0");
    expect(localUrl).toBeTruthy();

    // Build an overlay bundle containing a different asset for the same piece.
    const overlayBundle = {
      format: "splendor-art-bundle",
      version: 1,
      assets: [
        {
          id: "overlay-a",
          name: "overlay.png",
          mimeType: "image/png",
          hideDefaultHud: false,
          data: "data:image/png;base64,AAAA",
        },
      ],
      mapping: { "card:t1:0": "overlay-a" },
    };
    store.applyOverlayBundle(overlayBundle);

    // Overlay should take precedence.
    const overlayUrl = store.getUrlForPiece("card:t1:0");
    expect(overlayUrl).toBeTruthy();
    expect(overlayUrl).not.toBe(localUrl);

    store.clearOverlayBundle();
    // Back to local mapping.
    expect(store.getUrlForPiece("card:t1:0")).toBe(localUrl);
  });
});
