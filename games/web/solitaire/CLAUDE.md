# CLAUDE.md — `@ai-arcade/solitaire`

Klondike solitaire web game. See root
[`REPO_MAP.md`](../../../REPO_MAP.md).

## Purpose and scope

- **Does:** render a classic Klondike game (stock, waste, foundations,
  7-column tableau) with drag-and-drop card movement.
- **Does NOT:** support multiplayer, save/resume, hints, undo, or
  variants other than Klondike.

## Run, test, lint, build

```bash
# Dev server
npm run dev --workspace @ai-arcade/solitaire

# Build
npm run build --workspace @ai-arcade/solitaire

# Lint/format (from repo root)
npm run lint
npm run format:check

# Tests: none today. See IMPROVEMENTS.md item 23.
```

## Key files

| File              | Role                                                   |
|-------------------|--------------------------------------------------------|
| `index.html`      | Markup + loads `src/ui.js` as a module.                |
| `src/engine.js`   | Pure Klondike rules (205 lines): deck, moves, win.     |
| `src/ui.js`       | DOM rendering + drag-and-drop wiring (246 lines).      |
| `vite.config.js`  | Uses root `createGameConfig({ root })`.                |
| `package.json`    | Depends on `@arcade/shared-ui` (workspace ref `*`).    |

## Boundary rules

- **Owns:** everything under `games/web/solitaire/`.
- **Consumes:**
  - `./engine.js` (relative, same package).
  - `@arcade/shared-ui` → `GameHeader`, `GameOver`.
- **Must never import:** from other `games/web/*` or `apps/**`. The
  engine must remain DOM-free so it stays testable without a browser.
- **Must never:** move card-state mutation into `ui.js`. Keep the
  engine/ui split from [docs/03-module-extraction.md](../../../docs/03-module-extraction.md).

## Sharp edges

- **No tests.** The engine is pure and testable in principle; adding a
  `src/__tests__/engine.test.js` is the single highest-value change.
- **Drag-and-drop is HTML5-native** (not a library). Safari and Firefox
  handle `dragstart`/`drop` subtly differently — test manually on both
  after UI changes.
- No persistence — a refresh resets the deal. Intentional for now.

## Extraction status

**Ready to extract** once tests exist. No cross-workspace imports
besides `@arcade/shared-ui`; the game is dependency-free inside the
package.

## When working here

- **Do** put all logic in `src/engine.js` (pure) and reach for the DOM
  only in `src/ui.js`.
- **Do** write Vitest tests for engine changes before editing `ui.js`.
- **Do** use `@arcade/shared-ui` components (`GameHeader`, `GameOver`)
  rather than rolling new header/overlay UI.
- **Avoid** storing game state on DOM nodes (e.g. via `dataset`). Keep
  it in the engine's state object.
- **Avoid** importing other games or their engines.
