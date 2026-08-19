/**
 * SoundStore — persistent user-sound storage for the soundboard.
 *
 * Stores uploaded/recorded audio clips (Blobs) in IndexedDB so they survive
 * page reloads and return visits. Metadata is hydrated into memory on init,
 * so reads ({@link listSounds}, {@link getBlob}) are cheap and synchronous
 * where possible.
 *
 * IndexedDB schema (DB name configurable for tests):
 *   - object store "sounds" (keyPath "id"):
 *       { id, name, mimeType, size, createdAt, data: ArrayBuffer }
 *
 * Audio is stored as an ArrayBuffer rather than a Blob — ArrayBuffers
 * structured-clone reliably everywhere (including fake-indexeddb in tests),
 * and {@link getBlob} rebuilds a typed Blob on demand.
 */

const DB_VERSION = 1;
const SOUNDS_STORE = "sounds";

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

export class SoundStore {
  constructor(dbName = "soundboard") {
    this._dbName = dbName;
    this._db = null;
    this._ready = null;
    /** @type {Array<{id: string, name: string, mimeType: string, size: number, createdAt: number, data: ArrayBuffer}>} */
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
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(SOUNDS_STORE)) {
          db.createObjectStore(SOUNDS_STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async _hydrate() {
    const all = await this._txAll();
    all.sort((a, b) => a.createdAt - b.createdAt);
    this._sounds = all;
  }

  _txAll() {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(SOUNDS_STORE, "readonly");
      const req = tx.objectStore(SOUNDS_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  _txPut(value) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(SOUNDS_STORE, "readwrite");
      const req = tx.objectStore(SOUNDS_STORE).put(value);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  _txDelete(key) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(SOUNDS_STORE, "readwrite");
      const req = tx.objectStore(SOUNDS_STORE).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Sync snapshot of sound metadata in insertion order. Blobs are omitted —
   * use {@link getBlob} to fetch audio data for playback.
   */
  listSounds() {
    return this._sounds.map(({ id, name, mimeType, size, createdAt }) => ({
      id,
      name,
      mimeType,
      size,
      createdAt,
    }));
  }

  /**
   * @param {string} name  Display name (falls back to "untitled").
   * @param {Blob}   blob  Audio blob.
   * @returns {Promise<string>} new sound id
   */
  async addSound(name, blob) {
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
    const record = {
      id: genId(),
      name: (name ?? "").trim() || "untitled",
      mimeType: blob.type,
      size: blob.size,
      createdAt: Date.now(),
      data,
    };
    await this._txPut(record);
    this._sounds.push(record);
    this._emit();
    return record.id;
  }

  async renameSound(id, name) {
    const sound = this._sounds.find((s) => s.id === id);
    if (!sound) return;
    sound.name = (name ?? "").trim() || "untitled";
    await this._txPut(sound);
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
    return sound ? new Blob([sound.data], { type: sound.mimeType }) : null;
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
