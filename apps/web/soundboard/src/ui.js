/**
 * DOM layer for the soundboard. Pure logic lives in store.js / audio.js;
 * this module renders the pad grid and wires user actions to those modules.
 *
 * `mount(root, { store, player, media, storage })` takes injected
 * dependencies so tests can stub the store/player and skip browser-only
 * APIs (MediaDevices, MediaRecorder).
 */

import { hotkeyForIndex, isVirtualCableLabel, formatBytes } from "./audio.js";
import { soundNameFromFile } from "./store.js";

const SETTINGS_KEY = "soundboard-settings";

function loadSettings(storage) {
  try {
    return JSON.parse(storage?.getItem(SETTINGS_KEY)) ?? {};
  } catch {
    return {};
  }
}

function saveSettings(storage, patch) {
  if (!storage) return;
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify({ ...loadSettings(storage), ...patch }));
  } catch {
    /* storage full or unavailable — settings just won't persist */
  }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * @param {HTMLElement} root
 * @param {{
 *   store: import("./store.js").SoundStore,
 *   player: import("./audio.js").Player,
 *   media?: MediaDevices,
 *   storage?: Storage,
 * }} deps
 */
export function mount(root, { store, player, media, storage }) {
  const settings = loadSettings(storage);
  let outputDeviceId = settings.outputDeviceId ?? "";
  let outputDeviceLabel = settings.outputDeviceLabel ?? "";
  let monitor = settings.monitor ?? true;
  player.setOutput(outputDeviceId);
  player.setMonitor(monitor);

  root.innerHTML = "";
  const app = el("div", "soundboard");

  // ── Header ─────────────────────────────────────────────────────────
  const header = el("header", "sb-header");
  header.append(el("h1", "sb-title", "🔊 Soundboard"));
  const statusLine = el("p", "sb-status", "");
  header.append(statusLine);
  app.append(header);

  // ── Toolbar: add / record / stop ───────────────────────────────────
  const toolbar = el("div", "sb-toolbar");

  const fileInput = el("input");
  fileInput.type = "file";
  fileInput.accept = "audio/*";
  fileInput.multiple = true;
  fileInput.id = "sound-file-input";
  fileInput.hidden = true;

  const addBtn = el("button", "sb-btn sb-btn-primary", "➕ Add sounds");
  addBtn.type = "button";
  addBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    for (const file of fileInput.files ?? []) {
      try {
        await store.addSound(soundNameFromFile(file.name), file);
      } catch (err) {
        setStatus(`Couldn't add "${file.name}": ${err.message}`, true);
      }
    }
    fileInput.value = "";
  });

  const recordBtn = el("button", "sb-btn", "🎙️ Record");
  recordBtn.type = "button";
  recordBtn.addEventListener("click", () => toggleRecording());

  const stopBtn = el("button", "sb-btn", "⏹ Stop all");
  stopBtn.type = "button";
  stopBtn.id = "stop-all";
  stopBtn.addEventListener("click", () => player.stopAll());

  toolbar.append(addBtn, recordBtn, stopBtn, fileInput);
  app.append(toolbar);

  // ── Output routing ─────────────────────────────────────────────────
  const routing = el("section", "sb-routing");
  routing.append(el("h2", "sb-section-title", "Output"));

  const deviceRow = el("div", "sb-device-row");
  const deviceSelect = el("select", "sb-device-select");
  deviceSelect.id = "output-device";
  deviceSelect.addEventListener("change", () => {
    outputDeviceId = deviceSelect.value;
    outputDeviceLabel = deviceSelect.selectedOptions[0]?.textContent ?? "";
    player.setOutput(outputDeviceId);
    saveSettings(storage, { outputDeviceId, outputDeviceLabel });
    updateRoutingHint();
  });

  const enableBtn = el("button", "sb-btn", "🎧 Choose output device");
  enableBtn.type = "button";
  enableBtn.addEventListener("click", () => refreshDevices({ requestPermission: true }));

  deviceRow.append(deviceSelect, enableBtn);
  routing.append(deviceRow);

  const monitorLabel = el("label", "sb-monitor");
  const monitorCheck = el("input");
  monitorCheck.type = "checkbox";
  monitorCheck.id = "monitor-toggle";
  monitorCheck.checked = monitor;
  monitorCheck.addEventListener("change", () => {
    monitor = monitorCheck.checked;
    player.setMonitor(monitor);
    saveSettings(storage, { monitor });
  });
  monitorLabel.append(monitorCheck, document.createTextNode(" Also play through my speakers"));
  routing.append(monitorLabel);

  const routingHint = el("p", "sb-hint");
  routing.append(routingHint);

  const help = el("details", "sb-help");
  const helpSummary = el("summary", "", "How do I get sounds into Discord / game chat?");
  const helpBody = el("div", "sb-help-body");
  helpBody.innerHTML = `
    <ol>
      <li>Install a <strong>virtual audio cable</strong>:
        <a href="https://vb-audio.com/Cable/" target="_blank" rel="noreferrer">VB-Cable</a> (Windows),
        <a href="https://existential.audio/blackhole/" target="_blank" rel="noreferrer">BlackHole</a> (macOS),
        or a PulseAudio/PipeWire null sink (Linux).</li>
      <li>Click <strong>Choose output device</strong> above and pick the cable's
        <em>input</em> end (e.g. "CABLE Input").</li>
      <li>In Discord (or your game's voice settings), set the
        <strong>microphone / input device</strong> to the cable's <em>output</em> end
        (e.g. "CABLE Output").</li>
      <li>Keep <strong>Also play through my speakers</strong> on so you hear the sounds too.</li>
      <li>To mix your real mic in as well, use
        <a href="https://vb-audio.com/Voicemeeter/" target="_blank" rel="noreferrer">VoiceMeeter</a>
        (Windows) or an aggregate device (macOS) and point Discord at that instead.</li>
    </ol>`;
  help.append(helpSummary, helpBody);
  routing.append(help);
  app.append(routing);

  // ── Pad grid ───────────────────────────────────────────────────────
  const gridSection = el("section", "sb-grid-section");
  const grid = el("div", "sound-grid");
  const empty = el("p", "sb-empty", "No sounds yet — add an audio file or record one!");
  gridSection.append(grid, empty);
  app.append(gridSection);

  root.append(app);

  function setStatus(message, isError = false) {
    statusLine.textContent = message;
    statusLine.classList.toggle("sb-status-error", isError);
  }

  function updateRoutingHint() {
    if (!outputDeviceId) {
      routingHint.textContent =
        "Playing through your default output. Pick a virtual cable device to route into Discord or game chat.";
    } else if (isVirtualCableLabel(outputDeviceLabel)) {
      routingHint.textContent = `Routing to ${outputDeviceLabel} — set it as your mic in Discord/your game.`;
    } else {
      routingHint.textContent = `Playing through ${outputDeviceLabel || "the selected device"}.`;
    }
  }

  function renderDeviceOptions(outputs) {
    deviceSelect.innerHTML = "";
    const def = el("option", "", "Default output");
    def.value = "";
    deviceSelect.append(def);
    for (const device of outputs) {
      const option = el("option", "", device.label || `Output ${deviceSelect.length}`);
      option.value = device.deviceId;
      deviceSelect.append(option);
    }
    // Restore the saved device by id, falling back to its label (ids can
    // change between visits in some browsers).
    const byId = outputs.find((d) => d.deviceId === outputDeviceId);
    const byLabel = outputs.find((d) => d.label && d.label === outputDeviceLabel);
    const restored = byId ?? byLabel;
    deviceSelect.value = restored ? restored.deviceId : "";
    if (restored && restored.deviceId !== outputDeviceId) {
      outputDeviceId = restored.deviceId;
      player.setOutput(outputDeviceId);
      saveSettings(storage, { outputDeviceId });
    }
  }

  async function refreshDevices({ requestPermission = false } = {}) {
    if (!media?.enumerateDevices) {
      setStatus(
        "This browser can't pick output devices — sounds play on the default output.",
        true,
      );
      return;
    }
    try {
      if (requestPermission && typeof media.getUserMedia === "function") {
        // Device labels are hidden until a media permission is granted.
        const stream = await media.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
      const devices = await media.enumerateDevices();
      const outputs = devices.filter((d) => d.kind === "audiooutput");
      renderDeviceOptions(outputs);
      const cable = outputs.find((d) => isVirtualCableLabel(d.label));
      if (requestPermission && cable && !outputDeviceId) {
        setStatus(`Found a virtual cable: "${cable.label}" — select it to route into voice chat.`);
      }
      updateRoutingHint();
    } catch (err) {
      setStatus(`Couldn't list audio devices: ${err.message}`, true);
    }
  }

  // ── Recording ──────────────────────────────────────────────────────
  let recorder = null;

  async function toggleRecording() {
    if (recorder) {
      recorder.stop();
      return;
    }
    if (!media?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("Recording isn't supported in this browser.", true);
      return;
    }
    try {
      const stream = await media.getUserMedia({ audio: true });
      const chunks = [];
      recorder = new MediaRecorder(stream);
      recorder.addEventListener("dataavailable", (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      });
      recorder.addEventListener("stop", async () => {
        stream.getTracks().forEach((t) => t.stop());
        const mimeType = recorder.mimeType || "audio/webm";
        recorder = null;
        recordBtn.textContent = "🎙️ Record";
        recordBtn.classList.remove("sb-recording");
        const blob = new Blob(chunks, { type: mimeType });
        if (blob.size === 0) return;
        const name = window.prompt("Name this sound:", "new recording");
        if (name === null) return;
        try {
          await store.addSound(name, blob);
        } catch (err) {
          setStatus(`Couldn't save recording: ${err.message}`, true);
        }
      });
      recorder.start();
      recordBtn.textContent = "⏹ Stop recording";
      recordBtn.classList.add("sb-recording");
      setStatus("Recording… click again to stop.");
    } catch (err) {
      recorder = null;
      setStatus(`Couldn't start recording: ${err.message}`, true);
    }
  }

  // ── Pads ───────────────────────────────────────────────────────────
  function playSound(id) {
    player.play(id, {
      onError: (err) => setStatus(`Playback failed: ${err.message}`, true),
    });
  }

  function renderGrid() {
    const sounds = store.listSounds();
    grid.innerHTML = "";
    empty.hidden = sounds.length > 0;

    sounds.forEach((sound, index) => {
      const pad = el("button", "sound-pad");
      pad.type = "button";
      pad.title = `${sound.name} (${formatBytes(sound.size)})`;
      pad.addEventListener("click", () => playSound(sound.id));

      const hotkey = hotkeyForIndex(index);
      if (hotkey) pad.append(el("span", "sound-pad-key", hotkey));
      pad.append(el("span", "sound-pad-name", sound.name));

      const actions = el("span", "sound-pad-actions");

      const renameBtn = el("span", "sound-pad-action", "✏️");
      renameBtn.title = "Rename";
      renameBtn.setAttribute("role", "button");
      renameBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const name = window.prompt("Rename sound:", sound.name);
        if (name !== null) store.renameSound(sound.id, name);
      });

      const deleteBtn = el("span", "sound-pad-action", "🗑️");
      deleteBtn.title = "Delete";
      deleteBtn.setAttribute("role", "button");
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (window.confirm(`Delete "${sound.name}"?`)) {
          player.invalidate?.(sound.id);
          store.removeSound(sound.id);
        }
      });

      actions.append(renameBtn, deleteBtn);
      pad.append(actions);
      grid.append(pad);
    });
  }

  function onKeydown(e) {
    if (e.target instanceof HTMLElement && /^(input|textarea|select)$/i.test(e.target.tagName)) {
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const sounds = store.listSounds();
    const index = e.key === "0" ? 9 : Number.parseInt(e.key, 10) - 1;
    if (Number.isInteger(index) && index >= 0 && index < sounds.length && hotkeyForIndex(index)) {
      playSound(sounds[index].id);
    } else if (e.key === "Escape") {
      player.stopAll();
    }
  }

  window.addEventListener("keydown", onKeydown);
  store.onChange(renderGrid);
  renderGrid();
  updateRoutingHint();
  // Populate whatever device labels are available without prompting.
  refreshDevices();

  return {
    unmount() {
      window.removeEventListener("keydown", onKeydown);
    },
  };
}
