# CLAUDE.md — `@ai-arcade/space-invaders`

Canvas-based arcade shooter. See root
[`REPO_MAP.md`](../../../REPO_MAP.md).

## Purpose and scope

- **Does:** render a real-time Space Invaders clone on an HTML5
  `<canvas>`, driven by `requestAnimationFrame`.
- **Does NOT:** use DOM rendering. Every other web game in this repo
  builds DOM nodes; this one does not.

## Run, test, lint, build

```bash
# Dev server
npm run dev --workspace @ai-arcade/space-invaders

# Build
npm run build --workspace @ai-arcade/space-invaders

# Lint/format (from repo root)
npm run lint
npm run format:check

# Tests: none today. See IMPROVEMENTS.md item 24.
```

## Key files

| File             | Role                                                     |
|------------------|----------------------------------------------------------|
| `index.html`     | Minimal markup; hosts the `<canvas>`.                    |
| `src/engine.js`  | 434 lines: game loop step, collision, sprite defs.       |
| `src/ui.js`      | Canvas rendering + input + `requestAnimationFrame`.      |
| `vite.config.js` | Uses root `createGameConfig({ root })`.                  |
| `package.json`   | Depends on `@arcade/shared-ui` (for `GameHeader`/`GameOver`). |

## Boundary rules

- **Owns:** everything under `games/web/space-invaders/`.
- **Consumes:**
  - `./engine.js` (relative).
  - `@arcade/shared-ui` → `GameHeader`, `GameOver`.
- **Must never import:** DOM-creating code from `@arcade/shared-ui`
  into the canvas draw path. Shared UI is for overlay chrome around
  the canvas, not inside it.
- **Must never:** leak `requestAnimationFrame` IDs out of `ui.js`. The
  engine is `step(state, dt)`-shaped and must stay frame-agnostic so it
  can be tested without a browser.

## Sharp edges

- **Canvas-only rendering** is the deliberate deviation here. Don't
  "normalize" this package to the DOM pattern — its physics and
  collision logic assume canvas coordinates.
- **Sprite data lives inside `engine.js`.** Pixel-art sprite arrays are
  defined alongside game rules (see the top of `src/engine.js`). If
  sprites grow, consider a `src/sprites.js` module — but that's a
  refactor, not a requirement.
- **No save/restore.** Refresh resets the run.
- **Input handling is in `ui.js`.** `keydown`/`keyup` are listened at
  `window` scope; watch for focus bugs if embedding the canvas in other
  pages.

## Extraction status

**Ready to extract** once tests exist. Zero cross-workspace coupling
beyond `@arcade/shared-ui`.

## When working here

- **Do** inject `dt` (delta time) into `engine.step(state, dt)` so the
  engine is frame-rate independent and testable.
- **Do** add Vitest tests for deterministic engine transitions (enemy
  row stepping, collisions).
- **Do** preserve the "engine has no DOM, ui has no rules" split.
- **Avoid** `setInterval` for the game loop — use `requestAnimationFrame`
  (already in place) and pause cleanly on tab blur.
- **Avoid** adding PeerJS or any networking; multiplayer is Splendor's
  territory, and this package's build should remain zero-dep.
