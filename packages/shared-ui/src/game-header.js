/**
 * Game header component with arcade navigation, title, and optional settings.
 *
 * Usage:
 *   import { GameHeader } from '@arcade/shared-ui';
 *
 *   const header = new GameHeader({
 *     title: 'Sudoku',
 *     arcadeUrl: '../arcade-hub/index.html',
 *     settings: [
 *       { label: 'Dark Mode', type: 'toggle', onChange: (on) => toggleTheme(on) },
 *     ],
 *   });
 *   document.getElementById('app').prepend(header.el);
 */

const HEADER_CSS = `
.arcade-game-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--arcade-space-sm, 8px) var(--arcade-space-md, 16px);
  background: var(--arcade-surface, #fff);
  border-bottom: 1px solid var(--arcade-border, #dce1e8);
  border-radius: var(--arcade-radius-md, 8px);
  margin-bottom: var(--arcade-space-md, 16px);
  box-shadow: var(--arcade-shadow-sm, 0 1px 3px rgba(0,0,0,0.12));
  flex-wrap: wrap;
  gap: var(--arcade-space-sm, 8px);
}

.arcade-game-header__left {
  display: flex;
  align-items: center;
  gap: var(--arcade-space-sm, 8px);
}

.arcade-game-header__back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  color: var(--arcade-text-muted, #7f8c8d);
  font-size: var(--arcade-font-size-sm, 0.85rem);
  font-family: var(--arcade-font-family, sans-serif);
  transition: color var(--arcade-transition-fast, 150ms ease);
}

.arcade-game-header__back:hover {
  color: var(--arcade-primary, #4a90d9);
}

.arcade-game-header__title {
  font-family: var(--arcade-font-family, sans-serif);
  font-size: var(--arcade-font-size-lg, 1.25rem);
  font-weight: 700;
  color: var(--arcade-text, #2c3e50);
  margin: 0;
}

.arcade-game-header__right {
  display: flex;
  align-items: center;
  gap: var(--arcade-space-sm, 8px);
}

.arcade-game-header__toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--arcade-font-family, sans-serif);
  font-size: var(--arcade-font-size-sm, 0.85rem);
  color: var(--arcade-text-muted, #7f8c8d);
  cursor: pointer;
}

.arcade-game-header__toggle input {
  accent-color: var(--arcade-primary, #4a90d9);
  width: 16px;
  height: 16px;
}
`;

let styleInjected = false;

function injectStyle() {
  if (styleInjected) return;
  const style = document.createElement("style");
  style.textContent = HEADER_CSS;
  document.head.appendChild(style);
  styleInjected = true;
}

export class GameHeader {
  /**
   * @param {object} opts
   * @param {string} opts.title             - Game name
   * @param {string} [opts.arcadeUrl]       - URL to navigate back to the arcade hub
   * @param {Array}  [opts.settings]        - Array of { label, type: 'toggle', onChange, checked }
   * @param {HTMLElement} [opts.container]   - Where to mount (default: prepends to document.body)
   */
  constructor({ title, arcadeUrl = "../arcade-hub/index.html", settings = [], container } = {}) {
    injectStyle();

    this.el = document.createElement("header");
    this.el.className = "arcade-game-header";

    // Left section: back link + title
    const left = document.createElement("div");
    left.className = "arcade-game-header__left";

    const back = document.createElement("a");
    back.className = "arcade-game-header__back";
    back.href = arcadeUrl;
    back.textContent = "\u2190 Arcade";
    left.appendChild(back);

    const heading = document.createElement("h1");
    heading.className = "arcade-game-header__title";
    heading.textContent = title;
    left.appendChild(heading);

    // Right section: settings
    const right = document.createElement("div");
    right.className = "arcade-game-header__right";

    for (const setting of settings) {
      if (setting.type === "toggle") {
        const label = document.createElement("label");
        label.className = "arcade-game-header__toggle";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = setting.checked || false;
        checkbox.addEventListener("change", () => {
          if (setting.onChange) setting.onChange(checkbox.checked);
        });

        const span = document.createElement("span");
        span.textContent = setting.label;

        label.append(checkbox, span);
        right.appendChild(label);
      }
    }

    this.el.append(left, right);

    if (container) {
      container.prepend(this.el);
    }
  }

  /** Update the title text. */
  setTitle(text) {
    this.el.querySelector(".arcade-game-header__title").textContent = text;
  }
}
