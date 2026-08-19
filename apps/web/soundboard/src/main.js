/**
 * Soundboard entry point: wires the persistent SoundStore and the Player
 * to the DOM. All logic lives in store.js / audio.js / ui.js.
 */

import "./style.css";
import { SoundStore } from "./store.js";
import { Player } from "./audio.js";
import { mount } from "./ui.js";

async function start() {
  const app = document.querySelector("#app");
  if (!app) return;

  const store = new SoundStore();
  await store.init();
  const player = new Player(store);

  mount(app, {
    store,
    player,
    media: navigator.mediaDevices,
    storage: window.localStorage,
  });
}

if (typeof document !== "undefined") {
  start().catch((err) => {
    console.error("Soundboard failed to start:", err);
    const app = document.querySelector("#app");
    if (app) app.textContent = `Soundboard failed to start: ${err.message}`;
  });
}
