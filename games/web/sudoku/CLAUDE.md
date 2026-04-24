# CLAUDE.md — `@ai-arcade/sudoku`

Sudoku puzzle game with difficulty levels, undo, notes, hints,
save/resume, and URL-shared puzzles. See root
[`REPO_MAP.md`](../../../REPO_MAP.md).

## Purpose and scope

- **Does:** generate Sudoku puzzles with unique solutions, render a 9x9
  board, support notes mode, hints, undo, keyboard/mouse input,
  save/resume via localStorage, and puzzle sharing via URL hash.
- **Does NOT:** support multiplayer, timed challenge modes, or difficulty
  scaling beyond the hard-coded presets.

## Run, test, lint, build

```bash
# Dev server
npm run dev --workspace @ai-arcade/sudoku

# Build
npm run build --workspace @ai-arcade/sudoku

# Tests
npx vitest run games/web/sudoku/src/__tests__/

# Lint/format (from repo root)
npm run lint
npm run format:check
```

## Key files

| File                            | Role                                                   |
|---------------------------------|--------------------------------------------------------|
| `index.html`                    | Markup; loads `src/ui.js` as a module (line 113).      |
| `style.css`                     | Board styles (not shared).                             |
| `src/engine.js` (165 lines)     | Pure solver/generator: `isValid`, `solve`, `generate`, `encode`. |
| `src/game-state.js` (316 lines) | State machine: moves, notes, hints, undo, serialize.   |
| `src/ui.js` (410 lines)         | DOM rendering, timer, modals, save/load.               |
| `src/__tests__/engine.test.js`  | Generator/solver tests.                                |
| `src/__tests__/game-state.test.js` | State transitions + serialization.                  |
| `src/__tests__/fixtures.js`     | Shared puzzle fixtures.                                |
| `sudoku.js` / `game.js`         | **DEAD CODE.** Non-module legacy. See Sharp edges.     |

## Boundary rules

- **Owns:** everything under `games/web/sudoku/`, including the URL
  puzzle share format (`engine.js` `encode`/`decode`).
- **Consumes:**
  - `./engine.js`, `./game-state.js` (same-package).
  - `@arcade/shared-ui` → `Modal`, `GameHeader`, `GameOver`.
- **Must never import:** from other games. Do not mirror legacy
  `sudoku.js` / `game.js` — they are unloaded.

## Sharp edges

- **`sudoku.js` (170 lines) and `game.js` (617 lines) in the package
  root are DEAD CODE.** `index.html:113` only loads `src/ui.js`. They
  are kept "for reference" per
  [docs/03-module-extraction.md](../../../docs/03-module-extraction.md)
  §"Design Decisions #3". ESLint has a special carve-out for them at
  `eslint.config.js:117` (globals `Sudoku`, `Game`). Deleting both files
  and the ESLint block is the single highest-value quick-win here (see
  [IMPROVEMENTS.md](../../../IMPROVEMENTS.md) item 8).
- **localStorage schema has no version marker.** If `game-state.js`'s
  `serializeState` shape changes, stored games break silently on load.
- **Puzzle share URL uses `encode`/`decode` in `engine.js`.** Keep
  backward compatibility if you alter the format — shared URLs live
  forever.
- **Timer lives in `ui.js`** (intervals) — the engine is timer-agnostic.
  Do not move timer state into `game-state.js`.

## Extraction status

**Ready to extract** after the dead files are deleted. Engine +
game-state have a strong test suite; `ui.js` depends only on
`@arcade/shared-ui`.

## When working here

- **Do** delete `sudoku.js` and `game.js` the next time you touch this
  package (with a comment referring to IMPROVEMENTS.md item 8).
- **Do** write tests in `src/__tests__/` before engine or state changes.
  Both `engine.test.js` and `game-state.test.js` exist — extend them.
- **Do** use `fixtures.js` for test data; don't hardcode boards inline.
- **Avoid** re-introducing a non-module script pattern. Everything ES
  module, loaded via `<script type="module">`.
- **Avoid** serializing directly from `ui.js` — go through
  `game-state.serializeState`/`deserializeState` so the schema stays in
  one place.
