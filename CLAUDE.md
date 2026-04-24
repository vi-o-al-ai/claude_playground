# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A browser-based arcade of games and apps, built as an npm workspaces monorepo. Projects are organized by tech stack: `games/web/` (Vite + JS), `games/godot/` (Godot 4.6), `apps/web/` (Vite + JS), `apps/node/` (Node.js).

## Navigation docs

- [`REPO_MAP.md`](REPO_MAP.md) — top-level map, stack, commands, conventions.
- [`SUBPROJECTS.md`](SUBPROJECTS.md) — full inventory of the 10 sub-projects with inbound/outbound deps.
- [`IMPROVEMENTS.md`](IMPROVEMENTS.md) — boundary/coupling/CI findings, each tagged `[quick-win|medium|structural]` and `[safe|risky]`.

## Sub-projects

Each sub-project has its own `CLAUDE.md` with purpose, run/test/build
commands, key files, boundary rules, sharp edges, and extraction status.

| Sub-project                   | Path                                                           | One-liner                                              |
|-------------------------------|----------------------------------------------------------------|--------------------------------------------------------|
| `@arcade/shared-ui`           | [`packages/shared-ui/CLAUDE.md`](packages/shared-ui/CLAUDE.md) | Vanilla-JS components (Modal, GameHeader, GameOver).   |
| `@ai-arcade/arcade-hub`       | [`games/web/arcade-hub/CLAUDE.md`](games/web/arcade-hub/CLAUDE.md) | PWA landing page that links every game.            |
| `@ai-arcade/solitaire`        | [`games/web/solitaire/CLAUDE.md`](games/web/solitaire/CLAUDE.md) | Klondike solitaire with DOM drag-and-drop.          |
| `@ai-arcade/space-invaders`   | [`games/web/space-invaders/CLAUDE.md`](games/web/space-invaders/CLAUDE.md) | Canvas arcade shooter (rAF loop).            |
| `@ai-arcade/splendor`         | [`games/web/splendor/CLAUDE.md`](games/web/splendor/CLAUDE.md) | Multiplayer board game (PeerJS CDN, IndexedDB assets). |
| `@ai-arcade/sudoku`           | [`games/web/sudoku/CLAUDE.md`](games/web/sudoku/CLAUDE.md)     | Sudoku with save/resume, hints, URL sharing.           |
| `@ai-arcade/tic-tac-toe`      | [`games/web/tic-tac-toe/CLAUDE.md`](games/web/tic-tac-toe/CLAUDE.md) | Tic-tac-toe with deterministic AI. Reference engine/ui split. |
| Zombie Lane Runner (Godot)    | [`games/godot/runner/CLAUDE.md`](games/godot/runner/CLAUDE.md) | 3D lane runner built in Godot 4.6; own CI pipeline.    |
| `@ai-arcade/timeline-tracker` | [`apps/web/timeline-tracker/CLAUDE.md`](apps/web/timeline-tracker/CLAUDE.md) | Single-file inline-JS activity tracker.  |
| `@ai-arcade/news-digest`      | [`apps/node/news-digest/CLAUDE.md`](apps/node/news-digest/CLAUDE.md) | CI-only agent engine (PROMPT.md + JSON schema).   |

## Cross-boundary rule

**When working inside a sub-project directory, read that sub-project's
`CLAUDE.md` first.** It overrides root guidance for its own scope. Any
change that crosses a sub-project boundary (for example, editing
`@arcade/shared-ui` and a consumer in the same PR) requires updating
**both sides'** `CLAUDE.md` — the shared package's CLAUDE.md and the
consumer's — so the contract stays documented.

## Extraction roadmap

Priority order based on [`IMPROVEMENTS.md`](IMPROVEMENTS.md) and
[`SUBPROJECTS.md`](SUBPROJECTS.md):

**Ready to extract today** (no code changes required):

- **Zombie Lane Runner** — self-contained, own CI, own container image.
  Blocked only by shared GitHub Pages deploy plumbing.
- **`@ai-arcade/tic-tac-toe`** — textbook engine/ui split with tests.
- **`@ai-arcade/news-digest`** — already written to be consumed by an
  external private repo.

**Ready after small quick-wins** (listed in IMPROVEMENTS.md):

- **`@arcade/shared-ui`** — needs a build step + contract tests (items 18, 19).
- **`@ai-arcade/sudoku`** — needs dead-code removal (item 8/31).
- **`@ai-arcade/solitaire`**, **`@ai-arcade/space-invaders`** — add tests
  first (items 23, 24).
- **`@ai-arcade/timeline-tracker`** — do the engine/ui split (item 38).

**Blocked on structural change:**

- **`@ai-arcade/splendor`** — PeerJS CDN coupling (item 9/26). Must
  move to npm-bundled `peerjs` before extraction.

**Should stay in the monolith (for now):**

- **`@ai-arcade/arcade-hub`** — the assembled-site "front door." Its
  whole job is to link siblings via relative paths resolved by the
  deploy layout. Extraction cost > value today. See item 7 for the
  right prerequisite (generate `games.json` from the assemble step).

## Commands

```bash
npm run lint          # ESLint (JS + inline HTML scripts)
npm run lint:fix      # ESLint with auto-fix
npm run format:check  # Prettier check
npm run format        # Prettier write
npm run test          # Vitest (all workspaces)
npm run check         # lint + format:check + test (all-in-one local check)

# Run a single test file
npx vitest run games/web/sudoku/src/__tests__/engine.test.js

# Dev server for a specific game/app
npm run dev --workspace games/web/tic-tac-toe

# Build all packages
npm run build

# Godot GUT tests (from games/godot/runner/)
cd games/godot/runner
/Applications/Godot.app/Contents/MacOS/Godot --headless --script addons/gut/gut_cmdln.gd
```

Pre-commit hook (husky + lint-staged) runs ESLint and Prettier on staged `.js`, `.html`, `.json`, `.css`, `.md` files.

## Architecture

- **`games/web/*`** — Vite + Vanilla JS games. Each has its own `index.html`, `vite.config.js`, and `package.json`. Configs use `createGameConfig()` from the root `vite.shared.js`.
- **`games/godot/*`** — Godot 4.6 projects (GDScript, not JS). Excluded from ESLint. Uses GUT for testing; CI runs tests in a `barichello/godot-ci:4.6` container.
- **`apps/web/*`** — Vite + Vanilla JS apps (same structure as web games).
- **`apps/node/*`** — Node.js apps (non-browser, e.g. CI-only workflows).
- **`packages/shared-ui`** — Shared UI components (game-header, game-over, modal, theme CSS). Games depend on it via `@arcade/shared-ui`.
- **`games/web/arcade-hub`** — Landing page that links to all games.

## CI/CD

- **CI Web** (`.github/workflows/ci-web.yml`): lint, format check, vitest, build. Triggers on JS/Vite file changes. Node 22.
- **CI Godot** (`.github/workflows/ci-godot.yml`): GUT tests in `barichello/godot-ci:4.6` container. Triggers on `games/godot/runner/` changes.
- **Deploy** (`.github/workflows/deploy.yml`): Builds all Vite apps + exports Godot runner to web, assembles into GitHub Pages site at `/claude_playground/`.

## Starting New Work

**IMPORTANT:** Before starting any new feature, bug fix, or issue:

- If the user references an existing issue, run `/start-issue` to pull latest main and create a feature branch.
- If the user describes new work without an existing issue, run `/start-work` to create a GitHub issue first, then set up the branch.
  Never start work without an issue or on a stale branch.

## Development Workflow (TDD)

Always follow test-driven development. For every feature or bug fix:

1. **Write tests first** — Cover happy path, bad path, and edge cases. Tests go in `src/__tests__/` (Vitest) or `tests/` (GUT for Godot).
2. **Commit failing tests** — Commit the tests before writing any implementation code.
3. **Implement** — Write the minimum code to make all tests pass. Run tests to verify.
4. **Commit and request manual validation** — Commit the implementation, then ask the user to manually verify the behavior.
5. **Create a PR** — Once validated, create a pull request.

## Adding a New Game

1. Create `games/web/<name>/` with `package.json` (name `@ai-arcade/<name>`), `index.html`, `vite.config.js` (use `createGameConfig()`), and `src/`.
2. Add `@arcade/shared-ui` as a dependency if using shared components.
3. Run `npm install` from root to link workspaces.
4. Tests go in `src/__tests__/*.test.js` (Vitest + jsdom).
