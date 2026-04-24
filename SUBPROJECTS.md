# SUBPROJECTS.md

Inventory of each unit that could plausibly stand alone. Boundary signals used
per entry: separate `package.json`, distinct build target, independent test
suite, dedicated folder README/CLAUDE.md, import-graph isolation, distinct
domain vocabulary.

## Summary table

| # | Name / package                    | Path                              | Stack               | Inbound deps | Outbound deps                         | Tests |
|---|-----------------------------------|-----------------------------------|---------------------|--------------|---------------------------------------|-------|
| 1 | `@arcade/shared-ui`               | `packages/shared-ui/`             | Vanilla JS + CSS    | 5 games      | none (pure DOM)                       | yes   |
| 2 | `@ai-arcade/arcade-hub`           | `games/web/arcade-hub/`           | Static HTML + PWA   | none         | none (links to sibling builds)        | no    |
| 3 | `@ai-arcade/solitaire`            | `games/web/solitaire/`            | Vite + JS (DOM)     | none         | `@arcade/shared-ui`                   | no    |
| 4 | `@ai-arcade/space-invaders`       | `games/web/space-invaders/`       | Vite + JS (Canvas)  | none         | `@arcade/shared-ui`                   | no    |
| 5 | `@ai-arcade/splendor`             | `games/web/splendor/`             | Vite + JS + WebRTC  | none         | `@arcade/shared-ui`, PeerJS (CDN)     | yes   |
| 6 | `@ai-arcade/sudoku`               | `games/web/sudoku/`               | Vite + JS (DOM)     | none         | `@arcade/shared-ui`                   | yes   |
| 7 | `@ai-arcade/tic-tac-toe`          | `games/web/tic-tac-toe/`          | Vite + JS (DOM)     | none         | `@arcade/shared-ui`                   | yes   |
| 8 | Zombie Lane Runner                | `games/godot/runner/`             | Godot 4.6 GDScript  | none         | none (in-repo); GUT addon for tests   | yes   |
| 9 | `@ai-arcade/timeline-tracker`     | `apps/web/timeline-tracker/`      | Vite + inline HTML  | none         | none                                  | no    |
| 10| `@ai-arcade/news-digest`          | `apps/node/news-digest/`          | JSON schema + Prompt | none        | none at runtime (validated by Vitest) | yes   |

"Inbound deps" = workspaces that import from it. "Outbound deps" = workspaces
or external packages it imports at runtime.

---

## 1. `@arcade/shared-ui` — shared UI component library

- **Path:** `packages/shared-ui/`
- **Purpose:** Reusable vanilla-JS DOM components (`Modal`, `GameHeader`,
  `GameOver`) plus a theme CSS bundle, imported by web games for a consistent
  look.
- **Entry:** `src/index.js` re-exports `Modal`, `GameHeader`, `GameOver`.
  Subpath `@arcade/shared-ui/theme` → `src/theme.css`.
- **Run in isolation:** no dev server, no build. `npm test --workspace
  @arcade/shared-ui` runs Vitest against `src/__tests__/{modal,game-header,game-over}.test.js`.
- **Inbound dependencies (who imports it):**
  - `games/web/solitaire/src/ui.js:14`
  - `games/web/space-invaders/src/ui.js:15`
  - `games/web/splendor/src/ui.js:9`
  - `games/web/sudoku/src/ui.js:23`
  - `games/web/tic-tac-toe/src/ui.js:6`
- **Outbound dependencies:** none. Uses only browser globals
  (`document`, `HTMLElement`, etc.).
- **Shared code it touches that is NOT cleanly owned:** none — this is the
  cleanest boundary in the repo.
- **Notes:** Package has no `build` script; consumers import directly from
  source. Tests use jsdom. Signals: separate manifest, own tests, zero
  cross-imports, distinct vocabulary (`game-header`, `modal`).

## 2. `@ai-arcade/arcade-hub` — landing page / PWA shell

- **Path:** `games/web/arcade-hub/`
- **Purpose:** The deployed root page (`/claude_playground/arcade-hub/`).
  Lists all games, registers a service worker for offline access.
- **Entry:** `index.html` (no JS modules beyond an inline SW register);
  `public/sw.js` is the service worker; `public/manifest.json` is the PWA
  manifest.
- **Run in isolation:** `npm run dev --workspace @ai-arcade/arcade-hub`
  (Vite serves the page, but sibling game links `../<name>/index.html`
  resolve only against the deployed site layout — dev-server navigation to
  other games does not work locally).
- **Inbound dependencies:** none (not imported).
- **Outbound dependencies:** at build time none. At runtime it hyperlinks to
  other games' build outputs via relative paths assembled by
  `deploy.yml`.
- **Shared code it touches that is NOT cleanly owned:** it hardcodes the
  full game catalog (name, icon, href) inside `index.html` — every new game
  requires a manual edit here.
- **Signals:** own manifest, own service worker, no JS import edges,
  distinct "hub" domain vocabulary, no tests (acceptable — logic is trivial).

## 3. `@ai-arcade/solitaire`

- **Path:** `games/web/solitaire/`
- **Purpose:** Klondike solitaire with drag-and-drop tableau/foundation UI.
- **Entry:** `src/ui.js` (loaded by `index.html` as a module).
- **Files:** `src/engine.js` (205 lines, pure logic),
  `src/ui.js` (246 lines, DOM rendering + DnD).
- **Run in isolation:** `npm run dev --workspace @ai-arcade/solitaire`;
  `npm run build --workspace @ai-arcade/solitaire`.
- **Inbound:** none.
- **Outbound:** `./engine.js`, `@arcade/shared-ui` (`GameHeader`, `GameOver`).
- **Shared code not cleanly owned:** none.
- **Tests:** **none** — engine is pure and unit-testable in principle, but
  no `src/__tests__/` directory exists yet.

## 4. `@ai-arcade/space-invaders`

- **Path:** `games/web/space-invaders/`
- **Purpose:** Canvas-based arcade shooter with real-time game loop
  (`requestAnimationFrame`). Unlike other web games, it uses `<canvas>`
  rather than DOM nodes for rendering.
- **Entry:** `src/ui.js` (434-line `engine.js` + 247-line `ui.js`).
- **Run in isolation:** `npm run dev --workspace @ai-arcade/space-invaders`;
  `npm run build --workspace @ai-arcade/space-invaders`.
- **Inbound:** none.
- **Outbound:** `./engine.js`, `@arcade/shared-ui`.
- **Shared code not cleanly owned:** none.
- **Tests:** **none.**

## 5. `@ai-arcade/splendor`

- **Path:** `games/web/splendor/`
- **Purpose:** Online-capable port of the Splendor board game with custom
  art support. Biggest package in the monorepo (~2800 LOC of JS).
- **Entry:** `src/ui.js` (788 lines). `index.html` is ~32 KB (markup only).
- **Files:** `src/engine.js` (844 lines, pure rules), `src/network.js`
  (437 lines, PeerJS WebRTC), `src/asset-store.js` (555 lines, IndexedDB
  bundle storage), `src/asset-ui.js` (500 lines), `src/presets/demo-bundle.json`.
- **Run in isolation:** `npm run dev --workspace @ai-arcade/splendor`;
  `npm run build --workspace @ai-arcade/splendor`;
  `npx vitest run games/web/splendor/src/__tests__/`.
- **Inbound:** none.
- **Outbound:** `./engine.js`, `./network.js`, `./asset-store.js`,
  `./asset-ui.js`, `@arcade/shared-ui`. Plus a **runtime CDN dependency**
  on PeerJS via a `<script>` tag in `index.html`
  (`https://unpkg.com/peerjs@1.5.4/...`). `Peer` is declared as an ESLint
  browser global in `eslint.config.js:49`.
- **Shared code not cleanly owned:** none inside the repo. Externally, the
  CDN pin (`peerjs@1.5.4`) is duplicated in HTML and in the ESLint config
  comments and is not in the npm lockfile.
- **Tests:** `src/__tests__/engine.test.js`, `src/__tests__/asset-store.test.js`
  (uses `fake-indexeddb`).

## 6. `@ai-arcade/sudoku`

- **Path:** `games/web/sudoku/`
- **Purpose:** Sudoku puzzle with difficulty levels, undo, notes, hints,
  save/resume, URL-shared puzzles.
- **Entry:** `src/ui.js` via `index.html:113` (`<script type="module" src="src/ui.js">`).
- **Files (live):** `src/engine.js` (165), `src/game-state.js` (316),
  `src/ui.js` (410).
- **Files (dead code):** `sudoku.js` (170), `game.js` (617) in the package
  root. Not referenced by `index.html`; kept per
  `docs/03-module-extraction.md` §"Design Decisions #3" as reference.
  ESLint `eslint.config.js:117` carves out special rules for them
  (globals `Sudoku`, `Game`).
- **Run in isolation:** `npm run dev --workspace @ai-arcade/sudoku`;
  `npx vitest run games/web/sudoku/src/__tests__/`.
- **Inbound:** none.
- **Outbound:** `./engine.js`, `./game-state.js`, `@arcade/shared-ui`.
- **Shared code not cleanly owned:** the dead legacy scripts (see above)
  are the only ambiguity.
- **Tests:** `src/__tests__/engine.test.js`, `src/__tests__/game-state.test.js`,
  `src/__tests__/fixtures.js`.

## 7. `@ai-arcade/tic-tac-toe`

- **Path:** `games/web/tic-tac-toe/`
- **Purpose:** Classic tic-tac-toe with a deterministic AI opponent
  (win > block > center > corner > any).
- **Entry:** `src/ui.js`. `engine.js` is 116 lines.
- **Run in isolation:** `npm run dev --workspace @ai-arcade/tic-tac-toe`;
  `npx vitest run games/web/tic-tac-toe/src/__tests__/`.
- **Inbound:** none.
- **Outbound:** `./engine.js`, `@arcade/shared-ui`.
- **Shared code not cleanly owned:** none.
- **Tests:** `src/__tests__/engine.test.js` (the cleanest example in the
  repo of the engine/ui split).

## 8. Zombie Lane Runner (Godot)

- **Path:** `games/godot/runner/`
- **Purpose:** 3D endless lane runner with shooting, built in Godot 4.6 GL
  Compatibility (exports to Web).
- **Entry (runtime):** `scenes/stage_select.tscn` (per `project.godot:18`
  `run/main_scene`).
- **Key scripts (`scripts/`, 1217 total lines):** `main.gd` (364),
  `main_strafe.gd` (354), `player.gd` (156), `zombie.gd` (90), `hud.gd`,
  `bullet.gd`, `power_up.gd`, `zombie_pool.gd`, `game_constants.gd`,
  `stage_select.gd`.
- **Run in isolation:** open `project.godot` in Godot 4.6, press Play. Or
  CLI: `cd games/godot/runner && godot --headless -s res://addons/gut/gut_cmdln.gd`.
- **Inbound:** none.
- **Outbound:** bundled GUT addon at `addons/gut/` and built-in Godot
  libraries only. No npm or repo-level imports.
- **Shared code not cleanly owned:** **none** — this is the other cleanest
  boundary in the repo (excluded from ESLint/Prettier; separate CI; own
  container image).
- **Tests:** 18 GUT test scripts under `tests/` (collision, game_flow,
  lane_system, pause_menu, player_model, power_ups, runner, shooting,
  stage_select, strafe_stage, tighter_world, touch_controls, zombie,
  zombie_model, zombie_pool, polish, environment_props).

## 9. `@ai-arcade/timeline-tracker`

- **Path:** `apps/web/timeline-tracker/`
- **Purpose:** Real-time activity timeline tracker with
  localStorage persistence and JSON import/export.
- **Entry:** `index.html` — **all logic is inline** (~15 KB of markup +
  inline `<script>`). No `src/` directory.
- **Run in isolation:** `npm run dev --workspace @ai-arcade/timeline-tracker`;
  `npm run build --workspace @ai-arcade/timeline-tracker`.
- **Inbound:** none.
- **Outbound:** none at runtime. Build-time: `createGameConfig()` from root
  `vite.shared.js`.
- **Shared code not cleanly owned:** none — but the inline-script shape
  means it cannot be unit-tested without a DOM, which rules out reusing
  any logic elsewhere today.
- **Tests:** none.

## 10. `@ai-arcade/news-digest`

- **Path:** `apps/node/news-digest/`
- **Purpose:** **CI-only** agent engine. A scheduled GitHub Actions
  workflow in a separate private repo runs Claude Code with
  `PROMPT.md` as instructions and `sources.json` (per user) as config; it
  fetches subreddit/HN items, summarizes them, and commits a dated
  markdown digest. See `apps/node/news-digest/README.md`.
- **Entry:** `PROMPT.md`. Config schema: `sources.schema.json`. Example
  config: `sources.example.json`. Workflow template:
  `workflow.example.yml`.
- **Run in isolation:** **not runnable from this repo**. Verified only by
  a Vitest schema-shape test at `src/__tests__/config.test.js`.
- **Inbound:** none (inside this repo; the private workflow checks the
  engine out at `./engine`).
- **Outbound:** none inside the repo. External runtime: Claude Code GH
  Action, Reddit JSON API, HN Firebase API.
- **Shared code not cleanly owned:** none. Cleanly self-contained.
- **Tests:** `src/__tests__/config.test.js` only validates the example
  config against the schema shape.

---

## Unclear / ambiguous boundaries

- **Scope of shared UI for `arcade-hub`.** arcade-hub chose not to depend on
  `@arcade/shared-ui`. Should it, to get theme CSS consistency? Or is the
  hub intentionally a distinct visual language? Open question: does the hub
  belong alongside the games it lists, or is it infrastructure
  (a deploy-assembled site shell)?
- **Where should `timeline-tracker` live long-term?** It is in `apps/web/`
  but shares nothing with other apps, has no engine/ui split, no tests, and
  is the only inline-script build in the repo. If extracted, it is trivially
  its own static site; if kept, it should probably adopt the engine/ui
  pattern so it can be tested.
- **Is `apps/node/news-digest` really monorepo-shaped?** Its own README
  acknowledges it lives here only for lint/format/test piggybacking
  (`README.md:80`). It has no Node build, no runtime imports within the
  repo, and its only test is a JSON schema shape check. A standalone repo
  would work equally well; the question is whether the shared tooling is
  worth the coupling.
- **Second Godot game?** `games/godot/` is plural in naming but houses only
  `runner/`. `games/godot/CLAUDE.md` is written as if a second project could
  land any day. CI paths filter in `ci-godot.yml` is scoped to
  `games/godot/runner/**` — any new Godot project must be added explicitly.
