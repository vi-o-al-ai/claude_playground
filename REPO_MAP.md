# REPO_MAP.md

A high-level map of the `claude_playground` monorepo. Companion documents:

- `SUBPROJECTS.md` — full inventory of extractable units.
- `IMPROVEMENTS.md` — boundary / coupling / CI findings.
- Per-sub-project `CLAUDE.md` files — see `SUBPROJECTS.md` for paths.

## Elevator pitch

A browser-based arcade of games and apps plus one CI-only agent, built as an
npm workspaces monorepo. Most packages are Vite + vanilla JS; one is a Godot
4.6 project; one is a Node/CI prompt engine with no build step.

## Top-level layout

```
/                             # npm workspace root, ESLint, Prettier, Vitest, Husky
├── .github/workflows/        # 5 workflows: ci-web, ci-godot, deploy, claude, claude-code-review
├── .claude/skills/           # start-issue, start-work (workflow skills)
├── .husky/                   # pre-commit lint-staged hook
├── docs/                     # numbered design notes (01–07) + docs/superpowers/
├── apps/
│   ├── web/
│   │   └── timeline-tracker/ # Vite + inline-HTML app
│   └── node/
│       └── news-digest/      # CI-only engine (PROMPT.md + JSON schema)
├── games/
│   ├── web/
│   │   ├── arcade-hub/       # PWA landing page (links all games)
│   │   ├── solitaire/        # engine.js + ui.js
│   │   ├── space-invaders/   # canvas engine.js + ui.js
│   │   ├── splendor/         # engine + network (PeerJS CDN) + asset store
│   │   ├── sudoku/           # engine + game-state + ui (+ unused legacy)
│   │   └── tic-tac-toe/      # engine.js + ui.js
│   └── godot/
│       └── runner/           # "Zombie Lane Runner", Godot 4.6 GDScript
└── packages/
    └── shared-ui/            # @arcade/shared-ui — Modal, GameHeader, GameOver
```

File / language inventory per top-level directory:

| Directory      | Files / Languages                                | Packages |
|----------------|--------------------------------------------------|----------|
| `games/web`    | JS + HTML + CSS (6 Vite packages)                | 6        |
| `games/godot`  | GDScript + `.tscn` + `.glb` (1 Godot project)    | 1        |
| `apps/web`     | HTML + inline JS (1 Vite package)                | 1        |
| `apps/node`    | JSON + Markdown (1 non-build package)            | 1        |
| `packages`     | JS + CSS (1 shared library)                      | 1        |

Total workspace packages: **10** (9 JS + 1 non-npm Godot project).

## Stack

- **Runtime:** Node 22 (CI); browsers (evergreen) for games/apps.
- **Package manager:** npm 10 (workspaces). Single root `package-lock.json`.
- **Bundler:** Vite 8 per package, configured via `vite.shared.js`
  (`createGameConfig({ root, port })` at the repo root).
- **Lint/format:** ESLint 10 flat config (`eslint.config.js`), Prettier 3,
  `eslint-plugin-html` for inline `<script>` blocks. Pre-commit via Husky +
  lint-staged on `*.{js,html,json,css,md}`.
- **Tests:** Vitest 4 with jsdom. Web tests in `src/__tests__/*.test.js`.
  Godot tests via GUT in `games/godot/runner/tests/`.
- **Godot:** 4.6 stable, GL Compatibility renderer; CI uses
  `barichello/godot-ci:4.6` container.
- **Deploy target:** GitHub Pages at `/claude_playground/`. `PAGES_BASE` env
  var threads the base path through each Vite build.

## Entry points

| Package                          | Entry                                                  |
|----------------------------------|--------------------------------------------------------|
| `@ai-arcade/arcade-hub`          | `games/web/arcade-hub/index.html` (no JS module; PWA)  |
| `@ai-arcade/solitaire`           | `games/web/solitaire/src/ui.js`                        |
| `@ai-arcade/space-invaders`      | `games/web/space-invaders/src/ui.js`                   |
| `@ai-arcade/splendor`            | `games/web/splendor/src/ui.js`                         |
| `@ai-arcade/sudoku`              | `games/web/sudoku/src/ui.js`                           |
| `@ai-arcade/tic-tac-toe`         | `games/web/tic-tac-toe/src/ui.js`                      |
| `@ai-arcade/timeline-tracker`    | `apps/web/timeline-tracker/index.html` (inline JS)     |
| `@ai-arcade/news-digest`         | `apps/node/news-digest/PROMPT.md` (prompt-as-engine)   |
| `@arcade/shared-ui`              | `packages/shared-ui/src/index.js`                      |
| Zombie Lane Runner (Godot)       | `games/godot/runner/scenes/stage_select.tscn`          |

## Commands

From the repo root:

```bash
npm install                       # link workspaces
npm run lint                      # ESLint everywhere (JS + HTML inline scripts)
npm run lint:fix
npm run format:check              # Prettier check
npm run format
npm run test                      # Vitest across all workspaces
npm run check                     # lint + format:check + test (local gate)
npm run build                     # vite build in every workspace w/ a build script
npm run dev --workspace <name>    # e.g. --workspace @ai-arcade/tic-tac-toe
```

Single test file:

```bash
npx vitest run games/web/sudoku/src/__tests__/engine.test.js
```

Godot tests (local, requires Godot 4.6 binary):

```bash
cd games/godot/runner
godot --headless -s res://addons/gut/gut_cmdln.gd
```

Pre-commit hook runs ESLint + Prettier on staged `.js`, `.html`, `.json`,
`.css`, `.md` files (see root `package.json` `lint-staged`).

## Build / test / deploy targets

| Workflow                       | Trigger                                | Container                  | Purpose                                   |
|--------------------------------|----------------------------------------|----------------------------|-------------------------------------------|
| `.github/workflows/ci-web.yml` | push/PR on JS/Vite/workspace changes   | `ubuntu-latest` + Node 22  | `lint`, `format:check`, `test`, `build`   |
| `.github/workflows/ci-godot.yml` | push/PR on `games/godot/runner/**`   | `barichello/godot-ci:4.6`  | GUT tests                                 |
| `.github/workflows/deploy.yml` | push to `main` on any build input      | both                       | build web + export Godot web + Pages      |
| `.github/workflows/claude.yml` | `@claude` mentions / assigned issues   | `ubuntu-latest`            | Claude Code agent in CI                   |
| `.github/workflows/claude-code-review.yml` | PR opened / synchronize    | `ubuntu-latest`            | Claude auto-review PRs                    |

Deploy stages (all in `deploy.yml`): `build-web` → upload artifact;
`build-godot` → download export templates, `--export-release "Web"`, upload
artifact; `assemble` → merges both into `_site/` with each package's `dist/`
mapped to `_site/<name>/`, godot to `_site/runner/`; `deploy` →
`actions/deploy-pages@v4`.

## Notable conventions

- **Naming:** Games/apps use scope `@ai-arcade/*`. Shared lib uses
  `@arcade/shared-ui`. (Two scopes are in play — see `IMPROVEMENTS.md`.)
- **Game shape:** `engine.js` (pure, testable) + `ui.js` (DOM/Canvas).
  Tests sit in `src/__tests__/*.test.js`. See `docs/03-module-extraction.md`.
- **Shared UI is opt-in.** A game can skip `@arcade/shared-ui` entirely
  (arcade-hub, timeline-tracker, sudoku's legacy path do).
- **Non-JS packages opt out** via `eslint.config.js` `ignores` and
  `.prettierignore`. Currently only `games/godot/runner/`.
- **Pages base path:** every game/app build respects `PAGES_BASE` via
  `createGameConfig()` in `vite.shared.js`. Local dev uses `"/"`.
- **TDD workflow enforced in docs:** tests committed first; see root
  `CLAUDE.md` §"Development Workflow (TDD)".

## Coverage note

Fully read: every root manifest, every workspace `package.json`, every CI
workflow, every `vite.config.js`, the root `eslint.config.js` and
`vite.shared.js`, every pre-existing sub-project `CLAUDE.md`,
`docs/03-module-extraction.md`, `docs/02b-heterogeneous-tech-stacks.md`,
`apps/node/news-digest/README.md`, `games/web/splendor/src/network.js`
(header), `games/web/splendor/src/asset-store.js` (header),
`games/web/sudoku/{sudoku,game}.js` (first 40 lines),
`games/web/arcade-hub/{index.html,public/sw.js}`,
`games/godot/runner/project.godot`. Sampled (directory listings / line
counts only): full source of individual game `engine.js`/`ui.js` files,
Godot scripts/scenes contents, `docs/01,02,04-07`, `docs/superpowers/`.
