/**
 * Game-over overlay with stats display and restart action.
 *
 * Usage:
 *   import { GameOver } from '@arcade/shared-ui';
 *
 *   const gameOver = new GameOver();
 *   gameOver.show({
 *     title: 'You Win!',
 *     stats: [
 *       { label: 'Time', value: '3:42' },
 *       { label: 'Moves', value: '28' },
 *     ],
 *     onRestart: () => startNewGame(),
 *     restartLabel: 'Play Again',
 *   });
 */

const OVERLAY_CSS = `
.arcade-gameover-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
  opacity: 0;
  visibility: hidden;
  transition: opacity var(--arcade-transition-base, 250ms ease),
              visibility var(--arcade-transition-base, 250ms ease);
  z-index: 9500;
}

.arcade-gameover-overlay.active {
  opacity: 1;
  visibility: visible;
}

.arcade-gameover {
  background: var(--arcade-surface, #fff);
  color: var(--arcade-text, #2c3e50);
  border-radius: var(--arcade-radius-lg, 12px);
  box-shadow: var(--arcade-shadow-lg, 0 8px 24px rgba(0,0,0,0.2));
  padding: var(--arcade-space-xl, 32px);
  min-width: 280px;
  max-width: 420px;
  width: 90vw;
  text-align: center;
  transform: translateY(20px) scale(0.95);
  transition: transform var(--arcade-transition-base, 250ms ease);
}

.arcade-gameover-overlay.active .arcade-gameover {
  transform: translateY(0) scale(1);
}

.arcade-gameover__title {
  font-family: var(--arcade-font-family, sans-serif);
  font-size: var(--arcade-font-size-xl, 1.5rem);
  font-weight: 700;
  margin-bottom: var(--arcade-space-md, 16px);
}

.arcade-gameover__stats {
  display: flex;
  justify-content: center;
  gap: var(--arcade-space-lg, 24px);
  margin-bottom: var(--arcade-space-lg, 24px);
  flex-wrap: wrap;
}

.arcade-gameover__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--arcade-space-xs, 4px);
}

.arcade-gameover__stat-value {
  font-family: var(--arcade-font-mono, monospace);
  font-size: var(--arcade-font-size-xl, 1.5rem);
  font-weight: 700;
  color: var(--arcade-primary, #4a90d9);
}

.arcade-gameover__stat-label {
  font-family: var(--arcade-font-family, sans-serif);
  font-size: var(--arcade-font-size-sm, 0.85rem);
  color: var(--arcade-text-muted, #7f8c8d);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.arcade-gameover__actions {
  display: flex;
  gap: var(--arcade-space-sm, 8px);
  justify-content: center;
  flex-wrap: wrap;
}
`;

let styleInjected = false;

function injectStyle() {
  if (styleInjected) return;
  const style = document.createElement("style");
  style.textContent = OVERLAY_CSS;
  document.head.appendChild(style);
  styleInjected = true;
}

export class GameOver {
  constructor({ container = document.body } = {}) {
    injectStyle();

    this._overlay = document.createElement("div");
    this._overlay.className = "arcade-gameover-overlay";

    this._box = document.createElement("div");
    this._box.className = "arcade-gameover";

    this._title = document.createElement("h2");
    this._title.className = "arcade-gameover__title";

    this._stats = document.createElement("div");
    this._stats.className = "arcade-gameover__stats";

    this._actions = document.createElement("div");
    this._actions.className = "arcade-gameover__actions";

    this._box.append(this._title, this._stats, this._actions);
    this._overlay.appendChild(this._box);
    container.appendChild(this._overlay);
  }

  /** @returns {boolean} Whether the overlay is currently visible */
  get isOpen() {
    return this._overlay.classList.contains("active");
  }

  /**
   * Show the game-over overlay.
   *
   * @param {object} opts
   * @param {string} opts.title                 - e.g. "You Win!" or "Game Over"
   * @param {Array}  [opts.stats]               - Array of { label, value }
   * @param {Function} [opts.onRestart]          - Restart callback
   * @param {string}   [opts.restartLabel]       - Button text (default: "Play Again")
   * @param {Array}    [opts.extraButtons]       - Additional { label, onClick, variant } buttons
   */
  show({ title, stats = [], onRestart, restartLabel = "Play Again", extraButtons = [] } = {}) {
    this._title.textContent = title;

    // Build stats
    this._stats.innerHTML = "";
    for (const stat of stats) {
      const item = document.createElement("div");
      item.className = "arcade-gameover__stat";

      const val = document.createElement("span");
      val.className = "arcade-gameover__stat-value";
      val.textContent = stat.value;

      const lbl = document.createElement("span");
      lbl.className = "arcade-gameover__stat-label";
      lbl.textContent = stat.label;

      item.append(val, lbl);
      this._stats.appendChild(item);
    }

    // Build action buttons
    this._actions.innerHTML = "";

    if (onRestart) {
      const btn = document.createElement("button");
      btn.className = "arcade-btn arcade-btn--primary";
      btn.textContent = restartLabel;
      btn.addEventListener("click", () => {
        this.hide();
        onRestart();
      });
      this._actions.appendChild(btn);
    }

    for (const extra of extraButtons) {
      const btn = document.createElement("button");
      btn.className = `arcade-btn arcade-btn--${extra.variant || "secondary"}`;
      btn.textContent = extra.label;
      if (extra.onClick) {
        btn.addEventListener("click", () => {
          this.hide();
          extra.onClick();
        });
      }
      this._actions.appendChild(btn);
    }

    this._overlay.classList.add("active");
  }

  /** Hide the overlay. */
  hide() {
    this._overlay.classList.remove("active");
  }

  /** Remove from DOM. */
  destroy() {
    this._overlay.remove();
  }
}
