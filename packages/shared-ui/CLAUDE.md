# CLAUDE.md — `@arcade/shared-ui`

Shared vanilla-JS UI components for the arcade. See root
[`REPO_MAP.md`](../../REPO_MAP.md) and [`SUBPROJECTS.md`](../../SUBPROJECTS.md)
for where this fits in the monorepo.

## Purpose and scope

- **Does:** provide framework-free, drop-in DOM components (`Modal`,
  `GameHeader`, `GameOver`) and a theme CSS bundle consumable via
  `@arcade/shared-ui`.
- **Does NOT:** own any game logic, canvas rendering, animation loops,
  data persistence, or network code. Components are stateless-by-default
  (callers own all state).

## Run, test, lint, build

```bash
# Tests
npx vitest run packages/shared-ui/src/__tests__/
# or, all workspaces
npm test

# Lint (from repo root)
npm run lint

# Build
# There is no build step. Consumers import from source via the workspace.
```

No dev server here — this package has no runnable entry point.

## Key files

| File                         | Role                                            |
|------------------------------|-------------------------------------------------|
| `src/index.js`               | Barrel — re-exports `Modal`, `GameHeader`, `GameOver`. |
| `src/modal.js`               | Generic modal factory (open, close, focus trap).|
| `src/game-header.js`         | Top-of-game header (score, timer, back link).   |
| `src/game-over.js`           | End-of-game overlay with restart callback.      |
| `src/theme.css`              | Dark arcade theme tokens. Not auto-included.    |
| `src/__tests__/modal.test.js`| DOM behavior tests via jsdom.                   |
| `src/__tests__/game-header.test.js` | Header behavior + prop contract.         |
| `src/__tests__/game-over.test.js`   | Overlay render + restart wiring.         |
| `package.json`               | Exports map. No `build`/`dev` scripts.          |

## Boundary rules

- **Owns:** all code under `packages/shared-ui/src/`.
- **Consumes:** only standard browser DOM APIs. No other workspace.
- **Must never import:** anything from `games/**`, `apps/**`, or any
  browser feature behind a global (e.g. `Peer` from PeerJS). This
  package must stay pristine so it can be extracted to a standalone
  npm package later.
- **Must never assume:** a particular CSS framework, bundler, or
  localStorage schema. Callers pass in everything they need.

## Sharp edges

- `src/theme.css` is exported at subpath `./theme` but **no consumer
  imports it today** (games have their own inline CSS). Don't delete
  without confirming.
- `src/index.js` re-exports only three components. `Modal` is also
  exported on its own subpath (`./modal`) — if you add a component, add
  both its barrel export and consider whether a subpath export is useful.
- No build step means **renames are source-compatible immediately**, but
  also means consumers break the instant you change an export name.
  There are no contract tests catching that today (see
  [IMPROVEMENTS.md](../../IMPROVEMENTS.md) item 19).

## Extraction status

**Ready to extract.** Zero outbound deps inside the repo; 5 inbound
consumers use only the public barrel. Before publishing, add:

1. A build step (rollup or tsup) so consumers can be tree-shaken.
2. Contract tests that exercise the components against a jsdom host.
3. A renamed npm scope if the repo unifies on `@ai-arcade/*`
   (IMPROVEMENTS.md item 1).

## When working here

- **Do** add new components by creating a `src/<name>.js`, exporting a
  pure factory function, and re-exporting from `src/index.js`.
- **Do** write a Vitest + jsdom test for anything that touches the DOM.
- **Do** keep the public API JSDoc-annotated (consumers read JSDoc in
  their editor — there is no `.d.ts`).
- **Avoid** reaching into consumer-specific DOM (no `#board`, no
  `.splendor-board`, etc.).
- **Avoid** adding runtime deps — one dep here multiplies across every
  game.
- **Avoid** changing the exported API without updating every consumer
  listed in [SUBPROJECTS.md](../../SUBPROJECTS.md) §1.
