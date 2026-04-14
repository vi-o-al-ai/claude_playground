/**
 * Reusable modal component for AI Games Arcade.
 *
 * Usage:
 *   import { Modal } from '@arcade/shared-ui';
 *
 *   const modal = new Modal();
 *   modal.show({
 *     title: 'You Win!',
 *     message: 'Completed in 3:42 with 0 mistakes.',
 *     buttons: [
 *       { label: 'Play Again', onClick: () => restart(), variant: 'primary' },
 *       { label: 'Menu', onClick: () => goToMenu(), variant: 'secondary' },
 *     ],
 *   });
 *   modal.hide();
 */

const MODAL_CSS = `
.arcade-modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  opacity: 0;
  visibility: hidden;
  transition: opacity var(--arcade-transition-base, 250ms ease),
              visibility var(--arcade-transition-base, 250ms ease);
  z-index: 9000;
}

.arcade-modal-overlay.active {
  opacity: 1;
  visibility: visible;
}

.arcade-modal {
  background: var(--arcade-surface, #fff);
  color: var(--arcade-text, #2c3e50);
  border-radius: var(--arcade-radius-lg, 12px);
  box-shadow: var(--arcade-shadow-lg, 0 8px 24px rgba(0,0,0,0.2));
  padding: var(--arcade-space-lg, 24px);
  min-width: 280px;
  max-width: 420px;
  width: 90vw;
  text-align: center;
  transform: scale(0.9);
  transition: transform var(--arcade-transition-base, 250ms ease);
}

.arcade-modal-overlay.active .arcade-modal {
  transform: scale(1);
}

.arcade-modal__title {
  font-family: var(--arcade-font-family, sans-serif);
  font-size: var(--arcade-font-size-xl, 1.5rem);
  font-weight: 700;
  margin-bottom: var(--arcade-space-sm, 8px);
}

.arcade-modal__message {
  font-family: var(--arcade-font-family, sans-serif);
  font-size: var(--arcade-font-size-base, 1rem);
  color: var(--arcade-text-muted, #7f8c8d);
  margin-bottom: var(--arcade-space-lg, 24px);
  line-height: 1.5;
}

.arcade-modal__actions {
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
  style.textContent = MODAL_CSS;
  document.head.appendChild(style);
  styleInjected = true;
}

export class Modal {
  constructor({ container = document.body } = {}) {
    injectStyle();

    this._overlay = document.createElement("div");
    this._overlay.className = "arcade-modal-overlay";
    this._overlay.setAttribute("role", "dialog");
    this._overlay.setAttribute("aria-modal", "true");

    this._box = document.createElement("div");
    this._box.className = "arcade-modal";

    this._title = document.createElement("h2");
    this._title.className = "arcade-modal__title";

    this._message = document.createElement("div");
    this._message.className = "arcade-modal__message";

    this._actions = document.createElement("div");
    this._actions.className = "arcade-modal__actions";

    this._box.append(this._title, this._message, this._actions);
    this._overlay.appendChild(this._box);
    container.appendChild(this._overlay);

    // Close on backdrop click
    this._overlay.addEventListener("click", (e) => {
      if (e.target === this._overlay) this.hide();
    });

    // Close on Escape
    this._onKeydown = (e) => {
      if (e.key === "Escape" && this.isOpen) this.hide();
    };
    document.addEventListener("keydown", this._onKeydown);
  }

  /** @returns {boolean} Whether the modal is currently visible */
  get isOpen() {
    return this._overlay.classList.contains("active");
  }

  /**
   * Show the modal with the given content.
   *
   * @param {object} opts
   * @param {string} opts.title       - Heading text
   * @param {string|Node} [opts.message] - Body text, HTML string, or a DOM Node
   * @param {Array}  [opts.buttons]   - Array of { label, onClick, variant }
   * @param {boolean} [opts.dismissable=true] - Allow backdrop/escape close
   */
  show({ title, message = "", buttons = [], dismissable = true } = {}) {
    this._dismissable = dismissable;
    this._title.textContent = title;

    this._message.textContent = "";
    if (message instanceof Node) {
      this._message.appendChild(message);
    } else if (typeof message === "string" && message.includes("<")) {
      this._message.innerHTML = message;
    } else {
      this._message.textContent = message;
    }

    this._actions.innerHTML = "";
    for (const btn of buttons) {
      const el = document.createElement("button");
      el.className = `arcade-btn arcade-btn--${btn.variant || "primary"}`;
      el.textContent = btn.label;
      if (btn.onClick) {
        el.addEventListener("click", () => {
          btn.onClick();
          if (btn.autoClose !== false) this.hide();
        });
      }
      this._actions.appendChild(el);
    }

    this._overlay.classList.add("active");
  }

  /** Hide the modal. */
  hide() {
    this._overlay.classList.remove("active");
  }

  /** Remove the modal from the DOM entirely. */
  destroy() {
    document.removeEventListener("keydown", this._onKeydown);
    this._overlay.remove();
  }
}
