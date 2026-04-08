# Step 7: Godot Game Deployment

## Overview

The Zombie Lane Runner is a Godot 4.6 game that lives alongside the Vite-based web games. It exports to HTML5/WebAssembly and deploys to GitHub Pages via the same workflow.

## Project Location

```
games/runner/
├── project.godot         # Godot 4.6 (Forward Plus)
├── export_presets.cfg    # HTML5 export configuration
├── scenes/               # .tscn scene files
├── scripts/              # GDScript game logic
├── tests/                # GUT test suite (69 tests)
├── addons/gut/           # GUT testing framework
└── resources/            # Materials and assets
```

## How Deployment Works

The deploy workflow (`.github/workflows/deploy.yml`) has four jobs:

```
┌─────────────┐  ┌─────────────┐
│ build-web   │  │ build-godot │   ← run in parallel
│ (npm/Vite)  │  │ (Godot CI)  │
└──────┬──────┘  └──────┬──────┘
       │                │
       └───────┬────────┘
         ┌─────┴─────┐
         │ assemble  │   ← combines both into _site/
         └─────┬─────┘
         ┌─────┴─────┐
         │  deploy   │   ← pushes to GitHub Pages
         └───────────┘
```

### build-godot job

- Uses `barichello/godot-ci:4.6` Docker image (pre-installed Godot + export templates)
- Runs `godot --headless --import` to register resources
- Exports to HTML5 via `godot --headless --export-release "Web"`
- Uploads the export as a build artifact

### assemble job

- Downloads both the Vite build artifacts and Godot export
- Copies Vite games from `games/*/dist/` to `_site/`
- Copies Godot export to `_site/runner/`
- Uploads combined site as Pages artifact

## Export Configuration

`export_presets.cfg` defines the HTML5 export:

- **Excludes** test files and GUT addon (not needed at runtime)
- **Desktop texture compression** enabled for WebGL
- **Canvas resize policy** set to adaptive (fills container)
- **Focus on start** enabled (captures keyboard input immediately)

## Running Locally

### Prerequisites

- Godot 4.6 installed and in PATH

### Run the game

```bash
cd games/runner
godot
# Press F5 to run
```

### Run tests

```bash
cd games/runner
godot --headless --import
godot --headless -s res://addons/gut/gut_cmdln.gd
```

### Export locally

```bash
cd games/runner
mkdir -p web
godot --headless --export-release "Web" web/index.html
# Open web/index.html in a browser (requires a local HTTP server for WASM)
python3 -m http.server 8000 -d web
```

## Lint/Format Exclusions

The runner is a GDScript project, so it's excluded from JS tooling:

- **ESLint**: `games/runner/` in `eslint.config.js` ignores
- **Prettier**: `games/runner/` in `.prettierignore`
- **.gitignore**: `.godot/` and `*.uid` files excluded

## Adding Another Godot Game

1. Create `games/<name>/` with a Godot project
2. Add `export_presets.cfg` with a "Web" preset
3. Add to ESLint ignores and `.prettierignore`
4. Update the `build-godot` job to export the new game
5. Update the `assemble` job to copy the export to `_site/<name>/`
6. Add a card to `games/arcade-hub/index.html`
