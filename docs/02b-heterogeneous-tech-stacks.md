# Step 2b: Supporting Heterogeneous Tech Stacks

## Overview

The monorepo has been decoupled so that individual packages are **not required to use any specific tech stack**. A package can use Vite + vanilla JS, Godot, React, Unity WebGL, Phaser, or any other framework — the root tooling adapts rather than dictating.

## What Changed

### 1. `--if-present` for Build Scripts

```json
{
  "scripts": {
    "build": "npm run build --workspaces --if-present"
  }
}
```

The `--if-present` flag means packages without a `build` script are silently skipped. A Godot game with no npm build step won't break `npm run build`.

### 2. ESLint Ignores Non-JS Packages

```js
// eslint.config.js
{
  ignores: [
    // Non-JS game packages should be listed here to skip linting.
    // Example: "packages/my-godot-game/",
  ],
}
```

Add any non-JS package path to the `ignores` array and ESLint will skip it entirely.

### 3. Prettier Ignores Non-JS Packages

```
# .prettierignore
# Non-JS game packages (add directories here to skip formatting)
# Example: packages/my-godot-game/
```

Same pattern — non-JS packages opt out of formatting.

## Adding a Non-JS Game

### Example: Godot Game

```
packages/platformer/
├── package.json          # Minimal — no Vite, no npm build
├── project.godot         # Godot project file
├── scenes/
│   └── main.tscn
├── scripts/
│   └── player.gd         # GDScript
└── export/
    └── index.html        # Godot HTML5 export output
```

**package.json:**

```json
{
  "name": "@ai-arcade/platformer",
  "version": "1.0.0",
  "private": true,
  "description": "A platformer game built with Godot",
  "scripts": {
    "build": "godot --headless --export-release 'HTML5' export/index.html"
  }
}
```

Then add to ignore files:

1. `eslint.config.js` → add `"packages/platformer/"` to `ignores`
2. `.prettierignore` → add `packages/platformer/`

### Example: React Game

```
packages/puzzle-react/
├── package.json          # Has react, react-dom as dependencies
├── vite.config.js        # Uses @vitejs/plugin-react
├── src/
│   ├── App.tsx
│   └── main.tsx
└── index.html
```

React games still use Vite, so they integrate seamlessly — just add `@vitejs/plugin-react` as a dependency in that package.

## Design Principles

1. **No package is forced to use Vite** — it's available but optional
2. **Shared tooling is opt-out, not opt-in** — ESLint/Prettier run on everything by default; non-JS packages are excluded via ignore patterns
3. **Each package owns its build** — the root never assumes how a package is built
4. **`npm run build`** at the root builds everything that has a build script, skips the rest
5. **Dev dependencies stay at the root** — Vite, ESLint, Prettier are shared; package-specific deps (e.g., React, PeerJS) go in each package

## Checklist: Adding a New Package

- [ ] Create `packages/<name>/`
- [ ] Add `package.json` with `@ai-arcade/<name>` scope
- [ ] Add a `build` script if the package has a build step
- [ ] If non-JS: add to `eslint.config.js` ignores and `.prettierignore`
- [ ] Run `npm install` from root to register the workspace
- [ ] (Optional) Add to arcade-hub's index.html for navigation
