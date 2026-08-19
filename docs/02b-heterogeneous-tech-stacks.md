# Step 2b: Supporting Heterogeneous Tech Stacks

## Overview

The monorepo does not assume a project is a JS project. A game can be Vite + vanilla JS, Godot, Rust compiled to WebAssembly, or anything else that produces static files — the root tooling adapts rather than dictating.

The mechanism is the tree. Projects live at `<category>/<stack>/<project>`, and **the stack is a directory**:

```
claude_playground/
├── games/
│   ├── web/                  # Vite + vanilla JS
│   │   ├── arcade-hub/
│   │   ├── sudoku/
│   │   └── …
│   └── godot/                # Godot 4.6 + GDScript
│       └── runner/
├── apps/
│   ├── web/                  # Vite + vanilla JS (non-game)
│   │   └── baby-countdown/
│   └── node/                 # headless Node, CI-only
│       └── news-digest/
├── packages/                 # shared JS libraries
├── scripts/                  # repo tooling (manifest, scaffolder, ports)
└── templates/                # scaffolds for `npm run new`
```

Everything that varies by stack — how you build, how you test, what CI runs — is scoped to that one subtree. Everything that must stay uniform — the deployed URL, the hub card, the slug rules — is derived from the **category** and the **directory name**, which every stack has.

## The Contract a Stack Has to Meet

A new stack is not a framework integration. It is five small commitments:

### 1. Live in its own subtree

`<category>/<stack>/<project>`. The category is `games` or `apps`; it decides where the project lands on the site. The stack segment is an authoring detail and **never appears in a URL** — `games/web/sudoku` deploys to `/games/sudoku/` and `games/godot/runner` deploys to `/games/runner/`.

That is also the one cross-stack rule: because the slug is just the directory name, two projects in the same category can never share a name, even under different stacks. `node scripts/build-manifest.mjs --check` fails on a duplicate, and the deploy's assemble step refuses to overwrite an existing directory.

### 2. Opt in or out of npm

The root `package.json` lists workspace globs:

```json
{
  "workspaces": ["games/web/*", "apps/web/*", "apps/node/*", "packages/*"]
}
```

A JS stack adds its glob here and gets `npm install` linking and `npm run build --workspaces --if-present` for free (`--if-present` means a package with no `build` script is silently skipped). A non-JS stack is simply absent from that list — npm never sees it, and nothing breaks.

### 3. Opt out of the JS linters if it isn't JS

```js
// eslint.config.js
ignores: [
  "node_modules/",
  "**/dist/",
  "**/*.config.js",
  // Non-JS game packages
  "games/godot/runner/",
],
```

```
# .prettierignore
games/godot/runner/
```

Shared tooling is opt-out, not opt-in: ESLint and Prettier run on everything until a path is excluded.

### 4. Bring its own CI workflow

One workflow per stack, path-filtered to that subtree:

```yaml
# .github/workflows/ci-godot.yml
on:
  pull_request:
    branches: [main]
    paths:
      - "games/godot/**"
      - ".github/workflows/ci-godot.yml"
```

Keep the filter **stack-generic** (`games/godot/**`, not `games/godot/runner/**`) and loop over the projects inside the job. Then the second project in that stack needs no workflow edit. See [Step 5: CI Pipeline](./05-ci-pipeline.md) for what the current workflows do.

### 5. Declare itself to the hub

The arcade hub's cards are generated, never hand-written. Every deployable project declares three fields:

```json
"arcade": {
  "title": "Sudoku",
  "emoji": "🧩",
  "description": "Fill the grid with logic in this number puzzle."
}
```

npm workspaces put that block in their `package.json`. Projects npm knows nothing about put the same three fields in a standalone `arcade.json` at the project root. `scripts/build-manifest.mjs` walks `{games,apps}/*/*/`, reads whichever file is there, and writes the hub's manifest. A project with no metadata is skipped, which is how the hub itself and the CI-only Node app stay off the grid.

## Worked Example: Godot

The Zombie Lane Runner is the repo's only non-JS project, and it exercises every part of the contract.

**Tree** — `games/godot/runner/`, a plain Godot 4.6 project:

```
games/godot/runner/
├── project.godot
├── export_presets.cfg     # a "Web" preset
├── arcade.json            # title / emoji / description for the hub
├── scenes/  scripts/      # .tscn + GDScript
├── tests/                 # GUT test scripts
└── addons/gut/            # the GUT framework
```

**npm** — absent from `workspaces`. There is no `package.json`, no `node_modules`, no build script for npm to call.

**Linting** — `games/godot/runner/` is in both the ESLint ignores and `.prettierignore`. `.godot/` and `*.uid` are gitignored.

**Hub metadata** — `arcade.json`:

```json
{
  "title": "Zombie Lane Runner",
  "emoji": "🧟",
  "description": "Dodge and shoot zombies in this 3D endless lane runner."
}
```

**CI** — `ci-godot.yml` runs in a `barichello/godot-ci:4.6` container and loops over `games/godot/*/`, skipping anything without a `project.godot`, importing it twice (a Godot CI quirk: the first pass populates the resource cache, the second resolves imports that depend on it), then running GUT. It collects failures across projects instead of stopping at the first.

**Deploy** — `deploy.yml`'s `build-godot` job runs the same loop, exports each project with `godot --headless --export-release "Web" web/index.html`, and stages the output as `godot-export/<name>/`. The `assemble` job then copies it to `_site/games/<name>/` alongside the Vite builds. Details in [Step 7: Godot Game Deployment](./07-godot-game-deployment.md).

Note what is _not_ in that list: no root config knows the word "Godot" except two ignore entries. Adding a second Godot game is a directory, an `arcade.json`, and nothing else.

## Hypothetical: a Python App

Say you want a headless data-munging app in Python. It is an app, not a game, and it never ships to the browser — so it looks a lot like `apps/node/news-digest`, just in a different language.

```
apps/python/feed-sorter/
├── pyproject.toml
├── src/
└── tests/
```

- **Tree** — `apps/python/`, a new stack directory.
- **npm** — no glob; Python is not an npm workspace.
- **Linting** — add `apps/python/` to the ESLint ignores and `.prettierignore` (ruff/black live in the project, configured by `pyproject.toml`).
- **CI** — a new `.github/workflows/ci-python.yml`, path-filtered on `apps/python/**`, setting up Python and looping over `apps/python/*/` to run `pytest`.
- **Hub** — none. No `arcade.json` means no card, which is correct for something with no UI.
- **Docs** — an `apps/python/CLAUDE.md` describing the stack's build/test conventions, matching the tone of `games/web/CLAUDE.md`.

## Hypothetical: a Rust + WASM Game

A game compiled to WebAssembly does ship to the browser, so it also has to produce a directory of static files.

```
games/rust/orbit-lander/
├── Cargo.toml
├── arcade.json
├── src/
└── tests/
```

- **Tree** — `games/rust/`. It deploys to `/games/orbit-lander/`, so that slug must not already exist under `games/web/` or `games/godot/`.
- **npm** — no glob. `wasm-pack` is the build tool, not npm.
- **Linting** — `games/rust/` into the ESLint ignores and `.prettierignore`; `cargo fmt`/`clippy` cover the Rust side.
- **CI** — `.github/workflows/ci-rust.yml`, path-filtered on `games/rust/**`, running `cargo test` and `cargo clippy` per project.
- **Deploy** — a `build-rust` job that runs `wasm-pack build --target web` plus whatever copies the `index.html` and `.wasm` into a `dist/`-shaped directory, uploads it as an artifact, and an `assemble` step that copies each one to `_site/games/<name>/` through the same collision-checked helper the other stacks use.
- **Hub** — an `arcade.json` with title, emoji, and description. The card then appears with no hub edit at all.
- **Scaffolding** — once a second Rust game looks likely, add `templates/rust-game/` and a `TYPES` entry in `scripts/new-project.mjs` so `npm run new -- rust-game <name>` works like the others.

## Design Principles

1. **The tree carries the meaning** — category decides the URL and the hub section, directory name decides the slug and the dev port. Nothing is registered in a central list.
2. **Per-stack config, never per-project config** — path filters, loops, and globs are written against `<category>/<stack>/*`, so the Nth project in a stack costs zero configuration.
3. **Shared tooling is opt-out** — ESLint, Prettier, and Vitest run on everything until a path opts out.
4. **Each stack owns its build and its CI** — the root never assumes how a project is built, only that a deployable one produces a directory of static files.
5. **Metadata over code** — a project announces itself with three strings; the hub, the metadata gate, and the deploy read them.

## Checklist: Adding a New Stack

- [ ] Create `<category>/<stack>/` and the first project inside it
- [ ] Add a `<category>/<stack>/CLAUDE.md` describing build, test, and layout conventions
- [ ] Add the workspace glob to the root `package.json` — **only** if it is a JS stack
- [ ] If non-JS: add the subtree to `eslint.config.js` ignores and `.prettierignore`
- [ ] Add `.github/workflows/ci-<stack>.yml`, path-filtered on `<category>/<stack>/**`, looping over projects
- [ ] If it deploys: add an `arcade.json` per project and a build job + assemble step in `deploy.yml`
- [ ] Confirm the slug is unused in that category across every stack (`node scripts/build-manifest.mjs --check`)
- [ ] Once a second project is likely: add `templates/<stack>-<kind>/` and a `TYPES` entry in `scripts/new-project.mjs`

The same recipe, in checklist-with-reasoning form, lives in `.claude/skills/new-project/SKILL.md`.
