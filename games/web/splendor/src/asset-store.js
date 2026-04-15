/**
 * AssetStore — custom-art bundle storage for Splendor.
 *
 * Stores user-uploaded images (Blobs) in IndexedDB and maps them onto
 * individual game pieces (cards, nobles, gem tokens, deck piles, background)
 * via their stable piece IDs from engine.js. Rendering code calls the sync
 * helpers {@link getUrlForPiece} / {@link getHideHudForPiece} on every render.
 *
 * Custom art is **local per player** by default. When an online host broadcasts
 * their bundle to clients, the client applies it via {@link applyOverlayBundle}
 * which takes precedence over the local mapping for the duration of the game.
 * The local library is never overwritten.
 *
 * IndexedDB schema (DB name configurable for tests):
 *   - object store "assets" (keyPath "id"):
 *       { id, name, mimeType, size, hideDefaultHud, blob }
 *   - object store "meta" (keyPath "key"):
 *       { key: "mappings", value: { pieceId: assetId, ... } }
 */

const DB_VERSION = 1;
const ASSETS_STORE = "assets";
const META_STORE = "meta";
const MAPPINGS_KEY = "mappings";
const BUNDLE_FORMAT = "splendor-art-bundle";
const BUNDLE_VERSION = 1;

const MAX_DIM_DEFAULT = 1024;
const MAX_DIM_BACKGROUND = 2048;

function _genId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return "a_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }
  return "a_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function _blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function _dataUrlToBlob(dataUrl) {
  const match = /^data:([^;,]+)(;base64)?,(.*)$/.exec(dataUrl);
  if (!match) throw new Error("Invalid data URL");
  const mime = match[1];
  const isBase64 = !!match[2];
  const payload = match[3];
  let bytes;
  if (isBase64) {
    const bin = atob(payload);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } else {
    bytes = new TextEncoder().encode(decodeURIComponent(payload));
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Best-effort image downscale using OffscreenCanvas if available.
 * Returns the original blob on any failure (including missing browser APIs,
 * which is the common case in jsdom tests).
 */
async function _maybeDownscale(blob, maxDim) {
  try {
    if (typeof createImageBitmap !== "function") return blob;
    const bitmap = await createImageBitmap(blob);
    if (bitmap.width <= maxDim && bitmap.height <= maxDim) {
      bitmap.close?.();
      return blob;
    }
    const scale = maxDim / Math.max(bitmap.width, bitmap.height);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close?.();
      return await canvas.convertToBlob({ type: blob.type || "image/png" });
    }

    if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close?.();
      return await new Promise((resolve) => canvas.toBlob(resolve, blob.type || "image/png"));
    }
  } catch {
    /* fall through */
  }
  return blob;
}

export class AssetStore {
  constructor(dbName = "splendor-art") {
    this._dbName = dbName;
    this._db = null;
    this._ready = null;
    /** @type {Record<string, string>} piece id → asset id (local mapping) */
    this._mappings = {};
    /** @type {Record<string, {mimeType:string, hideDefaultHud:boolean, size:number, blob:Blob, name:string}>} */
    this._assetMeta = {};
    /** @type {Map<string, string>} asset id → object URL (cache) */
    this._urlCache = new Map();
    this._listeners = new Set();

    // Online overlay (non-persistent): host's broadcast bundle.
    this._overlayMappings = null; // Record<pieceId, assetId> or null
    this._overlayAssets = null; // Record<assetId, {blob, hideDefaultHud, ...}>
    this._overlayUrls = new Map(); // asset id → object URL
  }

  get ready() {
    return this._ready;
  }

  async init() {
    if (this._ready) return this._ready;
    this._ready = (async () => {
      this._db = await this._openDb();
      await this._hydrateCaches();
      return this;
    })();
    return this._ready;
  }

  _openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this._dbName, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(ASSETS_STORE)) {
          db.createObjectStore(ASSETS_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async _hydrateCaches() {
    // Load all assets into the lightweight meta cache so the sync helpers work.
    const all = await this._txAll(ASSETS_STORE);
    this._assetMeta = {};
    for (const rec of all) {
      this._assetMeta[rec.id] = {
        name: rec.name,
        mimeType: rec.mimeType,
        size: rec.size,
        hideDefaultHud: !!rec.hideDefaultHud,
        blob: rec.blob,
      };
    }

    // Load mappings.
    const rec = await this._txGet(META_STORE, MAPPINGS_KEY);
    this._mappings = rec?.value ?? {};
  }

  _txAll(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  _txGet(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  _txPut(storeName, value) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.put(value);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  _txDelete(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  _txClear(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async _persistMappings() {
    await this._txPut(META_STORE, { key: MAPPINGS_KEY, value: this._mappings });
  }

  // --------------------------------------------------------------------
  // Asset CRUD
  // --------------------------------------------------------------------

  /**
   * @param {string} name    Display name.
   * @param {Blob}   blob    Image blob.
   * @param {{hideDefaultHud?: boolean, maxDim?: number}} [opts]
   * @returns {Promise<string>} new asset id
   */
  async addAsset(name, blob, opts = {}) {
    if (!(blob instanceof Blob)) {
      throw new Error("addAsset expects a Blob");
    }
    if (!blob.type || !blob.type.startsWith("image/")) {
      throw new Error(`Not an image MIME type: ${blob.type || "(unknown)"}`);
    }
    const maxDim = opts.maxDim ?? MAX_DIM_DEFAULT;
    const storedBlob = await _maybeDownscale(blob, maxDim);

    const id = _genId();
    const record = {
      id,
      name: name || "untitled",
      mimeType: storedBlob.type || blob.type,
      size: storedBlob.size,
      hideDefaultHud: !!opts.hideDefaultHud,
      blob: storedBlob,
    };
    await this._txPut(ASSETS_STORE, record);
    this._assetMeta[id] = {
      name: record.name,
      mimeType: record.mimeType,
      size: record.size,
      hideDefaultHud: record.hideDefaultHud,
      blob: storedBlob,
    };
    this._emit();
    return id;
  }

  async removeAsset(id) {
    if (!this._assetMeta[id]) return;
    await this._txDelete(ASSETS_STORE, id);
    delete this._assetMeta[id];

    // Revoke cached URL.
    const cachedUrl = this._urlCache.get(id);
    if (cachedUrl) {
      URL.revokeObjectURL(cachedUrl);
      this._urlCache.delete(id);
    }

    // Clear any mapping that pointed at this asset.
    let mutated = false;
    for (const pieceId of Object.keys(this._mappings)) {
      if (this._mappings[pieceId] === id) {
        delete this._mappings[pieceId];
        mutated = true;
      }
    }
    if (mutated) await this._persistMappings();

    this._emit();
  }

  async listAssets() {
    return Object.entries(this._assetMeta).map(([id, meta]) => ({
      id,
      name: meta.name,
      mimeType: meta.mimeType,
      size: meta.size,
      hideDefaultHud: meta.hideDefaultHud,
    }));
  }

  async getAssetBlob(id) {
    const meta = this._assetMeta[id];
    return meta ? meta.blob : null;
  }

  async updateAsset(id, patch) {
    const meta = this._assetMeta[id];
    if (!meta) return;
    if (patch.name !== undefined) meta.name = patch.name;
    if (patch.hideDefaultHud !== undefined) meta.hideDefaultHud = !!patch.hideDefaultHud;
    await this._txPut(ASSETS_STORE, {
      id,
      name: meta.name,
      mimeType: meta.mimeType,
      size: meta.size,
      hideDefaultHud: meta.hideDefaultHud,
      blob: meta.blob,
    });
    this._emit();
  }

  /**
   * Sync. Returns a cached object URL for the given asset id, or null.
   */
  getAssetUrl(id) {
    if (!id) return null;
    const cached = this._urlCache.get(id);
    if (cached) return cached;
    const meta = this._assetMeta[id];
    if (!meta) return null;
    const url = URL.createObjectURL(meta.blob);
    this._urlCache.set(id, url);
    return url;
  }

  // --------------------------------------------------------------------
  // Mappings
  // --------------------------------------------------------------------

  setMapping(pieceId, assetId) {
    if (assetId === null || assetId === undefined) {
      if (pieceId in this._mappings) {
        delete this._mappings[pieceId];
        this._persistMappings().catch((err) =>
          console.error("AssetStore: failed to persist mappings", err),
        );
        this._emit();
      }
      return;
    }
    this._mappings[pieceId] = assetId;
    this._persistMappings();
    this._emit();
  }

  getMapping(pieceId) {
    return this._mappings[pieceId] ?? null;
  }

  getAllMappings() {
    return { ...this._mappings };
  }

  /**
   * Sync. Returns a URL usable in a CSS background-image for the given piece,
   * consulting the online overlay first, then the local mapping.
   */
  getUrlForPiece(pieceId) {
    // Check overlay first (host broadcast takes precedence).
    if (this._overlayMappings && this._overlayMappings[pieceId]) {
      const overlayAssetId = this._overlayMappings[pieceId];
      if (this._overlayUrls.has(overlayAssetId)) return this._overlayUrls.get(overlayAssetId);
      const entry = this._overlayAssets?.[overlayAssetId];
      if (entry) {
        const url = URL.createObjectURL(entry.blob);
        this._overlayUrls.set(overlayAssetId, url);
        return url;
      }
    }
    const assetId = this._mappings[pieceId];
    if (!assetId) return null;
    return this.getAssetUrl(assetId);
  }

  getHideHudForPiece(pieceId) {
    if (this._overlayMappings && this._overlayMappings[pieceId]) {
      const overlayAssetId = this._overlayMappings[pieceId];
      const entry = this._overlayAssets?.[overlayAssetId];
      return !!entry?.hideDefaultHud;
    }
    const assetId = this._mappings[pieceId];
    if (!assetId) return false;
    return !!this._assetMeta[assetId]?.hideDefaultHud;
  }

  // --------------------------------------------------------------------
  // Bundle export / import
  // --------------------------------------------------------------------

  async exportBundle() {
    const assets = [];
    for (const [id, meta] of Object.entries(this._assetMeta)) {
      const data = await _blobToDataUrl(meta.blob);
      assets.push({
        id,
        name: meta.name,
        mimeType: meta.mimeType,
        hideDefaultHud: meta.hideDefaultHud,
        data,
      });
    }
    return {
      format: BUNDLE_FORMAT,
      version: BUNDLE_VERSION,
      exportedAt: new Date().toISOString(),
      assets,
      mapping: { ...this._mappings },
    };
  }

  /**
   * @param {object} bundle
   * @param {{replace?: boolean}} [opts]
   */
  async importBundle(bundle, { replace = false } = {}) {
    if (!bundle || bundle.format !== BUNDLE_FORMAT) {
      throw new Error("Not a Splendor art bundle");
    }
    if (replace) {
      await this.clearAll({ _silent: true });
    }

    // Map old asset ids (as they appear in the bundle) to the new local ids
    // generated on import. Avoids collisions with existing assets.
    const idRemap = {};
    for (const asset of bundle.assets || []) {
      try {
        const blob = _dataUrlToBlob(asset.data);
        const newId = await this.addAsset(asset.name || "imported", blob, {
          hideDefaultHud: !!asset.hideDefaultHud,
        });
        idRemap[asset.id] = newId;
      } catch (err) {
        console.warn("Skipping malformed asset in bundle:", err);
      }
    }

    let mutated = false;
    for (const [pieceId, oldAssetId] of Object.entries(bundle.mapping || {})) {
      const newAssetId = idRemap[oldAssetId];
      if (newAssetId) {
        this._mappings[pieceId] = newAssetId;
        mutated = true;
      }
      // Unknown asset refs are silently ignored (tolerant importer).
    }
    if (mutated) await this._persistMappings();
    this._emit();
  }

  async clearAll({ _silent = false } = {}) {
    for (const url of this._urlCache.values()) {
      URL.revokeObjectURL(url);
    }
    this._urlCache.clear();
    await this._txClear(ASSETS_STORE);
    this._assetMeta = {};
    this._mappings = {};
    await this._persistMappings();
    if (!_silent) this._emit();
  }

  // --------------------------------------------------------------------
  // Online overlay (host broadcast)
  // --------------------------------------------------------------------

  /**
   * Apply a read-only "overlay" bundle that takes precedence over the local
   * mapping for the duration of an online game. The local library is not
   * touched. Overlay blobs live only in memory.
   */
  applyOverlayBundle(bundle) {
    if (!bundle || bundle.format !== BUNDLE_FORMAT) return;
    this.clearOverlayBundle({ _silent: true });

    const assetsById = {};
    for (const asset of bundle.assets || []) {
      try {
        const blob = _dataUrlToBlob(asset.data);
        if (!blob.type.startsWith("image/")) {
          throw new Error(`Non-image MIME: ${blob.type}`);
        }
        assetsById[asset.id] = {
          blob,
          hideDefaultHud: !!asset.hideDefaultHud,
          mimeType: asset.mimeType,
          name: asset.name,
        };
      } catch {
        /* skip malformed */
      }
    }
    this._overlayAssets = assetsById;
    this._overlayMappings = { ...(bundle.mapping || {}) };
    this._emit();
  }

  clearOverlayBundle({ _silent = false } = {}) {
    for (const url of this._overlayUrls.values()) {
      URL.revokeObjectURL(url);
    }
    this._overlayUrls.clear();
    this._overlayAssets = null;
    this._overlayMappings = null;
    if (!_silent) this._emit();
  }

  // --------------------------------------------------------------------
  // Events
  // --------------------------------------------------------------------

  /** @param {() => void} cb @returns {() => void} unsubscribe */
  onChange(cb) {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  _emit() {
    for (const cb of this._listeners) {
      try {
        cb();
      } catch (err) {
        console.error("AssetStore listener error:", err);
      }
    }
  }

  dispose() {
    for (const url of this._urlCache.values()) URL.revokeObjectURL(url);
    this._urlCache.clear();
    this.clearOverlayBundle();
    this._listeners.clear();
    if (this._db) {
      this._db.close();
      this._db = null;
    }
  }
}

export const MAX_IMAGE_DIM = {
  default: MAX_DIM_DEFAULT,
  background: MAX_DIM_BACKGROUND,
};
