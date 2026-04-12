# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A browser-based arcade of games and apps, built as an npm workspaces monorepo. Most packages are vanilla JS + Vite; one game (`games/runner`) is a Godot 4.6 project.

## Commands

```bash
npm run lint          # ESLint (JS + inline HTML scripts)
npm run lint:fix      # ESLint with auto-fix
npm run format:check  # Prettier check
npm run format        # Prettier write
npm run test          # Vitest (all workspaces)
npm run check         # lint + format:check + test (all-in-one local check)

# Run a single test file
npx vitest run games/sudoku/src/__tests__/engine.test.js

# Dev server for a specific game/app
npm run dev --workspace games/tic-tac-toe

# Build all packages
npm run build

# Godot GUT tests (from games/runner/)
cd games/runner
/Applications/Godot.app/Contents/MacOS/Godot --headless --script addons/gut/gut_cmdln.gd
```

Pre-commit hook (husky + lint-staged) runs ESLint and Prettier on staged `.js`, `.html`, `.json`, `.css`, `.md` files.

## Architecture

- **`games/*`** — Each game is an independent Vite app with its own `index.html`, `vite.config.js`, and `package.json`. Configs use `createGameConfig()` from the root `vite.shared.js`.
- **`apps/*`** — Non-game apps (same structure as games).
- **`packages/shared-ui`** — Shared UI components (game-header, game-over, modal, theme CSS). Games depend on it via `@arcade/shared-ui`.
- **`games/runner`** — Godot 4.6 project (GDScript, not JS). Excluded from ESLint. Uses GUT for testing; CI runs tests in a `barichello/godot-ci:4.6` container.
- **`games/arcade-hub`** — Landing page that links to all games.

## CI/CD

- **CI Web** (`.github/workflows/ci-web.yml`): lint, format check, vitest, build. Triggers on JS/Vite file changes. Node 22.
- **CI Godot** (`.github/workflows/ci-godot.yml`): GUT tests in `barichello/godot-ci:4.6` container. Triggers on `games/runner/` changes.
- **Deploy** (`.github/workflows/deploy.yml`): Builds all Vite apps + exports Godot runner to web, assembles into GitHub Pages site at `/claude_playground/`.

## Starting New Work

**IMPORTANT:** Before starting any new feature, bug fix, or issue, always run the `/start-issue` skill first to pull latest main and create a clean feature branch. Never start work on a stale branch.

## Development Workflow (TDD)

Always follow test-driven development. For every feature or bug fix:

1. **Write tests first** — Cover happy path, bad path, and edge cases. Tests go in `src/__tests__/` (Vitest) or `tests/` (GUT for Godot).
2. **Commit failing tests** — Commit the tests before writing any implementation code.
3. **Implement** — Write the minimum code to make all tests pass. Run tests to verify.
4. **Commit and request manual validation** — Commit the implementation, then ask the user to manually verify the behavior.
5. **Create a PR** — Once validated, create a pull request.

## Adding a New Game

1. Create `games/<name>/` with `package.json` (name `@ai-arcade/<name>`), `index.html`, `vite.config.js` (use `createGameConfig()`), and `src/`.
2. Add `@arcade/shared-ui` as a dependency if using shared components.
3. Run `npm install` from root to link workspaces.
4. Tests go in `src/__tests__/*.test.js` (Vitest + jsdom).
