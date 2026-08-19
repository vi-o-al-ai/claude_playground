/**
 * Placeholder entry point for Soundboard.
 *
 * Replace this with the real app: keep pure logic in its own modules and
 * DOM rendering separate.
 */

/**
 * The greeting shown while this project is still a stub.
 *
 * @returns {string}
 */
export function greeting() {
  return "🔊 Soundboard";
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
