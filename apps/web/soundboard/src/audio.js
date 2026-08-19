/**
 * Playback + routing for the soundboard.
 *
 * A sound can be routed to any audio *output* device via
 * HTMLMediaElement.setSinkId(). Pointing it at a virtual audio cable
 * (VB-Cable, VoiceMeeter, BlackHole, PulseAudio null sink, …) whose matching
 * *input* is selected as the microphone in Discord / a game lets everyone in
 * voice chat hear the sound. "Monitor" additionally plays a copy on the
 * default output so the local user hears it too.
 */

/**
 * Decides which sinks a sound should play on.
 *
 * @param {{deviceId: string | null | undefined, monitor: boolean}} settings
 * @returns {Array<{sinkId: string}>} one entry per simultaneous playback;
 *   sinkId "" means the browser's default output.
 */
export function planOutputs({ deviceId, monitor }) {
  if (!deviceId) return [{ sinkId: "" }];
  // "default" is Chrome's id for the default output — a monitor copy would
  // just double the volume on the same device.
  if (deviceId === "default") return [{ sinkId: "default" }];
  const outputs = [{ sinkId: deviceId }];
  if (monitor) outputs.push({ sinkId: "" });
  return outputs;
}

/**
 * Hotkey label for the pad at the given index: 1-9 then 0, null beyond.
 *
 * @param {number} index
 * @returns {string | null}
 */
export function hotkeyForIndex(index) {
  if (index >= 0 && index < 9) return String(index + 1);
  if (index === 9) return "0";
  return null;
}

const VIRTUAL_CABLE_PATTERNS = [
  /vb-audio/i,
  /virtual cable/i,
  /voicemeeter/i,
  /blackhole/i,
  /virtual audio/i,
  /null sink/i,
  /\bcable (input|output)\b/i,
];

/**
 * Heuristic: does this output-device label look like a virtual audio cable?
 * Used to auto-suggest the right routing device.
 *
 * @param {string} label
 * @returns {boolean}
 */
export function isVirtualCableLabel(label) {
  if (!label) return false;
  return VIRTUAL_CABLE_PATTERNS.some((re) => re.test(label));
}

/**
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Plays sounds from a SoundStore onto the configured output(s).
 * One object URL is cached per sound; playing a sound spawns short-lived
 * Audio elements (one per sink) that are tracked so stopAll() can cut them.
 */
export class Player {
  /** @param {{getBlob: (id: string) => Promise<Blob | null>}} store */
  constructor(store) {
    this._store = store;
    this._deviceId = "";
    this._monitor = true;
    /** @type {Map<string, string>} sound id → object URL */
    this._urls = new Map();
    /** @type {Set<HTMLAudioElement>} */
    this._playing = new Set();
  }

  /** @param {string} deviceId output device id ("" = default) */
  setOutput(deviceId) {
    this._deviceId = deviceId || "";
  }

  /** @param {boolean} monitor also play on the default output */
  setMonitor(monitor) {
    this._monitor = !!monitor;
  }

  async _urlFor(id) {
    const cached = this._urls.get(id);
    if (cached) return cached;
    const blob = await this._store.getBlob(id);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    this._urls.set(id, url);
    return url;
  }

  /**
   * @param {string} id sound id
   * @param {{onError?: (err: Error) => void}} [opts]
   */
  async play(id, opts = {}) {
    const url = await this._urlFor(id);
    if (!url) return;

    const outputs = planOutputs({ deviceId: this._deviceId, monitor: this._monitor });
    for (const { sinkId } of outputs) {
      const audio = new Audio(url);
      this._playing.add(audio);
      const done = () => this._playing.delete(audio);
      audio.addEventListener("ended", done);
      audio.addEventListener("error", done);
      try {
        if (sinkId && typeof audio.setSinkId === "function") {
          await audio.setSinkId(sinkId);
        }
        await audio.play();
      } catch (err) {
        done();
        opts.onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }

  stopAll() {
    for (const audio of this._playing) {
      audio.pause();
      audio.src = "";
    }
    this._playing.clear();
  }

  /** Drop the cached URL after a sound is deleted or replaced. */
  invalidate(id) {
    const url = this._urls.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      this._urls.delete(id);
    }
  }

  dispose() {
    this.stopAll();
    for (const url of this._urls.values()) URL.revokeObjectURL(url);
    this._urls.clear();
  }
}
