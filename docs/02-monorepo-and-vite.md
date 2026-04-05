# Step 2: Monorepo Structure with Vite

## Overview

The project has been restructured from a flat directory layout into an **npm workspaces monorepo**. Each game and utility is now an independent package with its own build pipeline powered by **Vite**.

## Why a Monorepo?

- **Isolation** — Each game can be developed, built, tested, and deployed independently
- **Scalability** — Adding a new game is as simple as creating a new `packages/<name>/` directory
- **Shared tooling** — Linting, formatting, and build config are shared from the root
- **Independent dependencies** — Each game can have its own `dependencies` if needed (e.g., Splendor uses PeerJS)

## Directory Structure

```
ai-games-arcade/
├── package.json              # Root workspace config (devDependencies, scripts)
├── eslint.config.js          # Shared ESLint config
├── .prettierrc               # Shared Prettier config
├── vite.shared.js            # Shared Vite config factory
├── docs/                     # Project documentation
│   ├── 01-linting-and-formatting.md
│   └── 02-monorepo-and-vite.md
└── packages/
    ├── arcade-hub/           # Landing page / game index
    │   ├── package.json
    │   ├── vite.config.js
    │   └── index.html
    ├── bowling/              # Bowling game
    │   ├── package.json
    │   ├── vite.config.js
    │   └── index.html
    ├── fighting/             # Punch Out! fighting game
    ├── solitaire/            # Solitaire card game
    ├── space-invaders/       # Space Invaders arcade game
    ├── splendor/             # Splendor board game (multiplayer)
    ├── sudoku/               # Sudoku puzzle game
    │   ├── package.json
    │   ├── vite.config.js
    │   ├── index.html
    │   ├── sudoku.js         # Puzzle engine
    │   ├── game.js           # UI controller
    │   └── style.css         # Styles
    ├── tic-tac-toe/          # Tic Tac Toe
    └── timeline-tracker/     # Timeline utility
```

## How It Works

### npm Workspaces

The root `package.json` declares:

```json
{
  "workspaces": ["packages/*"]
}
```

This means every directory under `packages/` is an independent npm package. Dev dependencies (ESLint, Prettier, Vite) are installed once at the root and shared by all packages.

### Vite Configuration

A shared config factory (`vite.shared.js`) provides consistent defaults:

```js
import { createGameConfig } from "../../vite.shared.js";

export default createGameConfig({
  root: resolve(import.meta.dirname, "."),
  port: 3001, // Each game gets a unique port
});
```

Each game gets its own dev server port (3001–3009) so you can run multiple games simultaneously during development.

## Usage

### Working on a Single Game

```bash
# Start dev server for bowling
npm run dev --workspace=packages/bowling

# Build only bowling
npm run build --workspace=packages/bowling

# Preview bowling's production build
npm run preview --workspace=packages/bowling
```

### Working on All Games

```bash
# Build all packages
npm run build --workspaces

# Lint everything
npm run lint

# Format everything
npm run format
```

### Adding a New Game

1. Create `packages/<game-name>/`
2. Add `package.json`:
   ```json
   {
     "name": "@ai-arcade/<game-name>",
     "version": "1.0.0",
     "private": true,
     "scripts": {
       "dev": "vite",
       "build": "vite build",
       "preview": "vite preview"
     }
   }
   ```
3. Add `vite.config.js` using the shared factory
4. Add `index.html` with your game
5. Run `npm install` from the root to register the new workspace

## Dev Server Ports

| Package          | Port |
| ---------------- | ---- |
| arcade-hub       | 3001 |
| bowling          | 3002 |
| fighting         | 3003 |
| solitaire        | 3004 |
| space-invaders   | 3005 |
| splendor         | 3006 |
| sudoku           | 3007 |
| tic-tac-toe      | 3008 |
| timeline-tracker | 3009 |

## Design Decisions

1. **npm workspaces over pnpm/yarn** — npm is the default Node.js package manager; avoids extra tooling.
2. **Shared Vite config factory** — Keeps individual configs to 5 lines while allowing per-game overrides.
3. **Each game is `"private": true`** — These are not published to npm; the flag prevents accidental publishing.
4. **`@ai-arcade/` scope** — Namespacing prevents package name collisions and makes workspace references clear.
5. **Old `ai_games/` and `ai_utilities/` removed** — All content moved to `packages/`; no duplication.

## Migration from Previous Structure

| Before                               | After                                  |
| ------------------------------------ | -------------------------------------- |
| `ai_games/bowling/index.html`        | `packages/bowling/index.html`          |
| `ai_games/solitaire.html`            | `packages/solitaire/index.html`        |
| `ai_games/tic-tac-toe.html`          | `packages/tic-tac-toe/index.html`      |
| `ai_utilities/timeline-tracker.html` | `packages/timeline-tracker/index.html` |
| `index.html` (root)                  | `packages/arcade-hub/index.html`       |

## Known Limitations

- **Sudoku JS files** are not yet ES modules — Vite copies them as-is rather than bundling. This will be addressed in Step 3 (module extraction).
- **Arcade hub links** use relative paths (`../bowling/index.html`) which work when packages are served side-by-side but require a combined deploy step for production hosting.
