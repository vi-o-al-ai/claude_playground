# CLAUDE.md — `@ai-arcade/tic-tac-toe`

Classic tic-tac-toe with a deterministic AI opponent. The cleanest
engine/ui split in the repo. See root
[`REPO_MAP.md`](../../../REPO_MAP.md).

## Purpose and scope

- **Does:** implement a 3x3 board with two players (human vs. human or
  human vs. deterministic AI) and win/draw detection.
- **Does NOT:** support larger boards, alpha-beta AI, or online play.

## Run, test, lint, build

```bash
# Dev server
npm run dev --workspace @ai-arcade/tic-tac-toe

# Build
npm run build --workspace @ai-arcade/tic-tac-toe

# Tests
npx vitest run games/web/tic-tac-toe/src/__tests__/

# Lint/format (from repo root)
npm run lint
npm run format:check
```

## Key files

| File                           | Role                                                |
|--------------------------------|-----------------------------------------------------|
| `index.html`                   | Markup; loads `src/ui.js` as a module.              |
| `src/engine.js` (116 lines)    | Pure rules + AI: `createGameState`, `makeMove`, `checkWin`, `computeComputerMove`, `restart`. |
| `src/ui.js` (131 lines)        | DOM rendering + click handlers + AI move delay.     |
| `src/__tests__/engine.test.js` | Engine + AI branch coverage.                        |
| `vite.config.js`               | Uses root `createGameConfig({ root })`.             |

## Boundary rules

- **Owns:** everything under `games/web/tic-tac-toe/`.
- **Consumes:**
  - `./engine.js` (same-package).
  - `@arcade/shared-ui` → `GameHeader`, `GameOver`.
- **Must never import:** from other games. The engine must stay
  DOM-free — `window`/`document` only appear in `ui.js`.

## Sharp edges

- **AI is deterministic** with a fixed priority: win > block > center >
  corner > any. Don't introduce randomness without a seed — tests
  depend on the ordering.
- **`window.restart` / `window.toggleMode` are assigned from `ui.js`**
  so inline `onclick="restart()"` handlers in `index.html` work. This
  is called out in
  [docs/03-module-extraction.md](../../../docs/03-module-extraction.md)
  §"Design Decisions #4" as intentional pragmatism; migrating to
  `addEventListener` is welcome but not required.
- **No persistence** — scores reset on refresh. Intentional.

## Extraction status

**Ready to extract.** This package is the textbook example of the
engine/ui pattern. Zero cross-workspace coupling besides
`@arcade/shared-ui`; solid test coverage of the AI.

## When working here

- **Do** preserve the engine's purity: take `state` in, return
  `{ result, winLine, winner }`-shaped results out.
- **Do** add a test for each new AI branch before touching
  `computeComputerMove`.
- **Do** exercise the engine/ui pattern as a reference when working on
  other games.
- **Avoid** reaching for `document.getElementById` inside `engine.js`.
- **Avoid** making AI stochastic; if you want variety, inject an RNG
  seeded by callers so tests stay deterministic.
