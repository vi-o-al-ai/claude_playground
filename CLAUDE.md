# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A browser-based arcade of games and apps, built as an npm workspaces monorepo. Projects live at `<category>/<stack>/<project>`: `games/web/` (Vite + JS), `games/godot/` (Godot 4.6), `apps/web/` (Vite + JS), `apps/node/` (Node.js). See `README.md` for the user-facing tour.

## Commands

```bash
npm run lint          # ESLint (JS + inline HTML scripts)
npm run lint:fix      # ESLint with auto-fix
npm run format:check  # Prettier check
npm run format        # Prettier write
npm run test          # Vitest (all workspaces + scripts/)
npm run check         # lint + format:check + test (all-in-one local check)

# Run a single test file
npx vitest run games/web/sudoku/src/__tests__/engine.test.js

# Dev server for a specific game/app (path, not package name)
npm run dev -w games/web/tic-tac-toe

# Build all packages
npm run build

# Scaffold a new project (see "Adding a New Game" below)
npm run new -- web-game <name>

# Validate arcade metadata / regenerate the hub manifest
node scripts/build-manifest.mjs --check
node scripts/build-manifest.mjs

# Godot GUT tests (from games/godot/runner/)
cd games/godot/runner
/Applications/Godot.app/Contents/MacOS/Godot --headless --script addons/gut/gut_cmdln.gd
```

Pre-commit hook (husky + lint-staged) runs ESLint and Prettier on staged `.js`, `.html`, `.json`, `.css`, `.md` files.

## Architecture

- **`games/web/*`** — Vite + Vanilla JS games. Each has its own `index.html`, `vite.config.js`, and `package.json`. Configs use `createProjectConfig({ root })` from the root `vite.shared.js`, which derives both the dev-server port (FNV-1a of the directory name, 3100–3499) and the deployed base path. Nothing is hand-picked.
- **`games/godot/*`** — Godot 4.6 projects (GDScript, not JS). Not npm workspaces; excluded from ESLint and Prettier. Uses GUT for testing; CI runs tests in a `barichello/godot-ci:4.6` container.
- **`apps/web/*`** — Vite + Vanilla JS apps (same structure as web games).
- **`apps/node/*`** — Node.js apps (non-browser, e.g. CI-only workflows). No Vite, no deploy.
- **`packages/shared-ui`** — Shared UI components (game-header, game-over, modal, theme CSS). Projects depend on it via `@ai-arcade/shared-ui`. Every package in the repo uses the `@ai-arcade/*` scope.
- **`scripts/`** — Repo tooling, tested like everything else: `build-manifest.mjs` (hub manifest + metadata validation), `new-project.mjs` (scaffolder), `lib/ports.mjs` (port derivation).
- **`templates/`** — Scaffold sources for `npm run new` (`web-game`, `web-app`, `node-app`).
- **`games/web/arcade-hub`** — Landing page, deployed at the site root (`siteRoot: true`). Its cards are **generated** from per-project `arcade` metadata by `scripts/build-manifest.mjs` (wired up as `predev`/`prebuild`). Never hand-edit cards into its `index.html`.

### URL scheme

The stack segment is an authoring detail and never appears in a URL:

| Project                   | URL                                               |
| ------------------------- | ------------------------------------------------- |
| `games/web/arcade-hub`    | `https://vi-o-al-ai.github.io/claude_playground/` |
| `games/web/sudoku`        | `…/claude_playground/games/sudoku/`               |
| `games/godot/runner`      | `…/claude_playground/games/runner/`               |
| `apps/web/baby-countdown` | `…/claude_playground/apps/baby-countdown/`        |

Because the slug is the directory name, it must be kebab-case and unique **within its category** across all stacks. `build-manifest.mjs --check` fails the build on a duplicate, and the deploy's assemble step refuses to clobber an existing directory.

## CI/CD

- **CI Web** (`.github/workflows/ci-web.yml`): three parallel jobs on Node 22 — lint + format check + `build-manifest.mjs --check` (metadata gate), unit tests, build all packages. Deliberately **no path filters**, so a new project is covered without editing the workflow.
- **CI Godot** (`.github/workflows/ci-godot.yml`): imports and runs GUT tests for every project under `games/godot/*` in a `barichello/godot-ci:4.6` container. Path-filtered on `games/godot/**`.
- **Deploy** (`.github/workflows/deploy.yml`): builds all Vite projects with `PAGES_BASE=/claude_playground`, exports every Godot project to web, then assembles a namespaced `_site` (hub at the root, games under `games/<slug>/`, apps under `apps/<slug>/`) with a collision check.

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

Never hand-create a project directory — use the generator, which puts it in the right tree with the right metadata:

```bash
npm run new -- web-game <name> --title "<Title>" --emoji "<emoji>" --description "<one line>"
npm install   # links the workspace, updates package-lock.json
```

Types: `web-game` → `games/web/`, `web-app` → `apps/web/`, `node-app` → `apps/node/`.

- `<name>` is the directory name, the deploy slug, and the dev-port seed. It must be kebab-case (`space-pinball`) and unique within its category across all stacks.
- The scaffold writes an `arcade` block (`{ title, emoji, description }`) into the project's `package.json`. That metadata is the only thing the hub, CI, and deploy need — no workflow or hub edits. Non-npm projects (Godot) use an `arcade.json` with the same fields instead; a project with no metadata stays off the hub.
- Add `@ai-arcade/shared-ui` as a dependency if using shared components.
- Tests go in `src/__tests__/*.test.js` (Vitest; opt into jsdom per file with a `// @vitest-environment jsdom` docblock).

For a whole new tech stack (new language or engine), see `.claude/skills/new-project/SKILL.md`.
