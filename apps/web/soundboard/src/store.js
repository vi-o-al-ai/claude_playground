/**
 * SoundStore — persistent user-sound storage for the soundboard.
 *
 * Stores uploaded/recorded audio clips in IndexedDB so they survive page
 * reloads and return visits. Only lightweight metadata is held in memory
 * (so a library of hundreds of sounds stays cheap); audio bytes are
 * fetched on demand by {@link getBlob}.
 *
 * IndexedDB schema, v2 (DB name configurable for tests):
 *   - object store "sounds" (keyPath "id"):
 *       { id, name, group, mimeType, size, createdAt }
 *   - object store "data" (keyPath "id"):
 *       { id, data: ArrayBuffer }
 *
 * v1 kept the ArrayBuffer inline on the sound record; the v2 upgrade moves
 * it into the "data" store. ArrayBuffers are used rather than Blobs because
 * they structured-clone reliably everywhere (including fake-indexeddb).
 *
 * Sounds can be shared via {@link exportBundle} / {@link importBundle}:
 * a JSON-safe object with base64 audio, suitable for saving to a file.
 */

const DB_VERSION = 2;
const SOUNDS_STORE = "sounds";
const DATA_STORE = "data";

export const BUNDLE_FORMAT = "soundboard-bundle";
const BUNDLE_VERSION = 1;

/** Per-clip size cap. Soundboard clips are short; 15 MB is generous. */
export const MAX_SOUND_BYTES = 15 * 1024 * 1024;

function genId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return "s_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }
  return "s_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/**
 * Derives a display name from an uploaded file name: strips the audio
 * extension and turns dashes/underscores into spaces.
 *
 * @param {string | undefined} filename
 * @returns {string}
 */
export function soundNameFromFile(filename) {
  const base = (filename ?? "").trim();
  if (!base) return "untitled";
  const withoutExt = base.replace(/\.(mp3|wav|ogg|oga|m4a|aac|flac|webm|opus)$/i, "");
  const pretty = withoutExt.replace(/[-_]+/g, " ").trim();
  return pretty || "untitled";
}

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function base64ToBuffer(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

export class SoundStore {
  constructor(dbName = "soundboard") {
    this._dbName = dbName;
    this._db = null;
    this._ready = null;
    /** @type {Array<{id: string, name: string, group: string, mimeType: string, size: number, createdAt: number}>} */
    this._sounds = [];
    this._listeners = new Set();
  }

  async init() {
    if (this._ready) return this._ready;
    this._ready = (async () => {
      this._db = await this._openDb();
      await this._hydrate();
      return this;
    })();
    return this._ready;
  }

  _openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this._dbName, DB_VERSION);
      req.onupgradeneeded = (event) => {
        const db = req.result;
        if (!db.objectStoreNames.contains(SOUNDS_STORE)) {
          db.createObjectStore(SOUNDS_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(DATA_STORE)) {
          db.createObjectStore(DATA_STORE, { keyPath: "id" });
        }
        if (event.oldVersion >= 1 && event.oldVersion < 2) {
          // v1 kept audio bytes inline on the sound record — move them out.
          const sounds = req.transaction.objectStore(SOUNDS_STORE);
          const data = req.transaction.objectStore(DATA_STORE);
          sounds.openCursor().onsuccess = (e) => {
            const cursor = e.target.result;
            if (!cursor) return;
            const rec = cursor.value;
            if (rec.data !== undefined) {
              data.put({ id: rec.id, data: rec.data });
              const meta = { ...rec, group: rec.group ?? "" };
              delete meta.data;
              cursor.update(meta);
            }
            cursor.continue();
          };
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async _hydrate() {
    const all = await new Promise((resolve, reject) => {
      const tx = this._db.transaction(SOUNDS_STORE, "readonly");
      const req = tx.objectStore(SOUNDS_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    all.sort((a, b) => a.createdAt - b.createdAt);
    this._sounds = all.map((rec) => ({ ...rec, group: rec.group ?? "" }));
  }

  /** Writes meta + data records atomically. `dataRecord` may be null. */
  _txWrite(metaRecord, dataRecord) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction([SOUNDS_STORE, DATA_STORE], "readwrite");
      tx.objectStore(SOUNDS_STORE).put(metaRecord);
      if (dataRecord) tx.objectStore(DATA_STORE).put(dataRecord);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  _txDelete(id) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction([SOUNDS_STORE, DATA_STORE], "readwrite");
      tx.objectStore(SOUNDS_STORE).delete(id);
      tx.objectStore(DATA_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  _txGetData(id) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(DATA_STORE, "readonly");
      const req = tx.objectStore(DATA_STORE).get(id);
      req.onsuccess = () => resolve(req.result?.data ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  /** Sync snapshot of sound metadata in insertion order. */
  listSounds() {
    return this._sounds.map((s) => ({ ...s }));
  }

  /**
   * @param {string} name  Display name (falls back to "untitled").
   * @param {Blob}   blob  Audio blob.
   * @param {{group?: string}} [opts]
   * @returns {Promise<string>} new sound id
   */
  async addSound(name, blob, opts = {}) {
    if (!(blob instanceof Blob)) {
      throw new Error("addSound expects a Blob");
    }
    if (!blob.type || !blob.type.startsWith("audio/")) {
      throw new Error(`Not an audio MIME type: ${blob.type || "(unknown)"}`);
    }
    if (blob.size > MAX_SOUND_BYTES) {
      throw new Error(`Sound is too large (max ${Math.round(MAX_SOUND_BYTES / 1024 / 1024)} MB)`);
    }
    const data = await blob.arrayBuffer();
    const meta = {
      id: genId(),
      name: (name ?? "").trim() || "untitled",
      group: (opts.group ?? "").trim(),
      mimeType: blob.type,
      size: blob.size,
      createdAt: Date.now(),
    };
    await this._txWrite(meta, { id: meta.id, data });
    this._sounds.push(meta);
    this._emit();
    return meta.id;
  }

  async renameSound(id, name) {
    const sound = this._sounds.find((s) => s.id === id);
    if (!sound) return;
    sound.name = (name ?? "").trim() || "untitled";
    await this._txWrite(sound, null);
    this._emit();
  }

  /** Moves a sound to a group ("" = ungrouped). */
  async setGroup(id, group) {
    const sound = this._sounds.find((s) => s.id === id);
    if (!sound) return;
    sound.group = (group ?? "").trim();
    await this._txWrite(sound, null);
    this._emit();
  }

  async removeSound(id) {
    const index = this._sounds.findIndex((s) => s.id === id);
    if (index === -1) return;
    await this._txDelete(id);
    this._sounds.splice(index, 1);
    this._emit();
  }

  /** @returns {Promise<Blob | null>} */
  async getBlob(id) {
    const sound = this._sounds.find((s) => s.id === id);
    if (!sound) return null;
    const data = await this._txGetData(id);
    return data ? new Blob([data], { type: sound.mimeType }) : null;
  }

  /**
   * JSON-safe bundle of sounds (audio as base64) for sharing.
   *
   * @param {{group?: string}} [opts] limit to one group
   */
  async exportBundle(opts = {}) {
    const wanted =
      opts.group === undefined ? this._sounds : this._sounds.filter((s) => s.group === opts.group);
    const sounds = [];
    for (const meta of wanted) {
      const data = await this._txGetData(meta.id);
      if (!data) continue;
      sounds.push({
        name: meta.name,
        group: meta.group,
        mimeType: meta.mimeType,
        data: bufferToBase64(data),
      });
    }
    return {
      format: BUNDLE_FORMAT,
      version: BUNDLE_VERSION,
      exportedAt: new Date().toISOString(),
      sounds,
    };
  }

  /**
   * Imports a bundle, skipping malformed entries.
   *
   * @param {object} bundle
   * @returns {Promise<number>} how many sounds were imported
   */
  async importBundle(bundle) {
    if (!bundle || bundle.format !== BUNDLE_FORMAT || !Array.isArray(bundle.sounds)) {
      throw new Error("Not a soundboard bundle");
    }
    let imported = 0;
    for (const entry of bundle.sounds) {
      try {
        const blob = new Blob([base64ToBuffer(entry.data)], { type: entry.mimeType });
        await this.addSound(entry.name, blob, { group: entry.group });
        imported++;
      } catch (err) {
        console.warn("Skipping malformed sound in bundle:", err);
      }
    }
    return imported;
  }

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
        console.error("SoundStore listener error:", err);
      }
    }
  }

  dispose() {
    this._listeners.clear();
    if (this._db) {
      this._db.close();
      this._db = null;
    }
  }
}
