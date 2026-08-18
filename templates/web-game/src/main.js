/**
 * Placeholder entry point for __TITLE__.
 *
 * Replace this with the real game: keep pure logic in its own module
 * (e.g. `engine.js`) and DOM rendering separate (e.g. `ui.js`).
 */

/**
 * The greeting shown while this project is still a stub.
 *
 * @returns {string}
 */
export function greeting() {
  return "__EMOJI__ __TITLE__";
}

/**
 * Renders the placeholder into a container element.
 *
 * @param {HTMLElement} root - Element to render into
 */
export function mount(root) {
  root.textContent = greeting();
}

const app = typeof document === "undefined" ? null : document.querySelector("#app");
if (app) mount(app);
