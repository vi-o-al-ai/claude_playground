# CLAUDE.md — Zombie Lane Runner

3D endless lane runner with shooting, built in Godot 4.6 (GL
Compatibility renderer for Web export). The only non-JS sub-project.
See root [`REPO_MAP.md`](../../../REPO_MAP.md).

## Purpose and scope

- **Does:** implement a lane-based endless runner with zombie waves,
  power-ups, pause menu, stage selection, and touch/keyboard controls.
  Exports to HTML5 for GitHub Pages deployment.
- **Does NOT:** share any code with the npm workspaces. Is not an npm
  package (no `package.json`). Lives at `games/godot/runner/`.

## Run, test, lint, build

```bash
# Open in Godot 4.6 editor (GUI)
# Open project.godot — main scene is scenes/stage_select.tscn

# Headless test run (requires Godot 4.6 on PATH)
cd games/godot/runner
godot --headless -s res://addons/gut/gut_cmdln.gd

# CI runs the same command in container barichello/godot-ci:4.6
# (see .github/workflows/ci-godot.yml)

# Web export (done in CI by .github/workflows/deploy.yml):
godot --headless --export-release "Web" web/index.html
```

ESLint/Prettier do **not** lint this directory — see
`eslint.config.js:70` (`games/godot/runner/` in `ignores`) and
`.prettierignore`.

## Key files

| File                           | Role                                                  |
|--------------------------------|-------------------------------------------------------|
| `project.godot`                | Godot project config. Main scene: `stage_select.tscn`.|
| `export_presets.cfg`           | Export targets (Web preset).                          |
| `.gutconfig.json`              | GUT test runner config.                               |
| `scripts/main.gd` (364)        | Main stage controller.                                |
| `scripts/main_strafe.gd` (354) | Strafe variant stage controller (near-duplicate).     |
| `scripts/player.gd` (156)      | Player physics, input, shooting.                      |
| `scripts/zombie.gd` / `zombie_pool.gd` | Enemy logic + object pooling.                 |
| `scripts/game_constants.gd`    | Shared constants (tunable values).                    |
| `scenes/`                      | `.tscn` scene graphs.                                 |
| `assets/`                      | Kenney-style `.glb` models + textures.                |
| `tests/test_*.gd` (18 files)   | GUT unit/integration tests.                           |
| `addons/gut/`                  | Vendored GUT testing addon.                           |

## Boundary rules

- **Owns:** everything under `games/godot/runner/`.
- **Consumes:** Godot 4.6 built-ins and the bundled GUT addon. Nothing
  from other workspaces.
- **Must never import:** anything from `games/web/**`, `packages/**`, or
  `apps/**`. Those are JS worlds; this is GDScript.
- **Must never:** be added to `eslint.config.js` outside the `ignores`
  list, or to a Vite workspace glob.

## Sharp edges

- **Two near-duplicate main controllers** (`main.gd`, `main_strafe.gd`)
  differ by stage rules. If they diverge further, extract shared logic
  to `scripts/game_constants.gd` or a new helper. See
  [IMPROVEMENTS.md](../../../IMPROVEMENTS.md) item 34.
- **GUT addon is vendored.** `addons/gut/` is ~MBs of unowned code.
  Upgrades happen by swapping the directory wholesale.
- **Deploy downloads export templates on every run**
  (`.github/workflows/deploy.yml:46-52`). If the upstream 404s or
  throttles, deploy breaks. See IMPROVEMENTS.md item 36.
- **GL Compatibility renderer is required** for broad browser support
  (`project.godot:23`). Don't switch to Forward+ — WebGL 2 coverage is
  insufficient.
- **Main scene is `stage_select.tscn`**, not `main.tscn`. Changing
  this needs a matching edit in `project.godot:18`.

## Extraction status

**Ready to extract.** Self-contained, separate CI pipeline, own
container image, no import edges to other workspaces. The main reason
it lives here is shared deploy → GitHub Pages; splitting it out would
require duplicating Pages plumbing or keeping a deploy-glue repo.

## When working here

- **Do** run `godot --headless -s res://addons/gut/gut_cmdln.gd` locally
  before pushing; `npm run check` does NOT cover Godot tests (see
  IMPROVEMENTS.md item 37).
- **Do** put tunable numbers in `scripts/game_constants.gd`, not in
  individual script files.
- **Do** reuse `zombie_pool.gd` for spawned objects — instance churn is
  a known perf pitfall on Web exports.
- **Avoid** pulling in external GDScript addons without pinning the
  version; GUT is already vendored and should set the pattern.
- **Avoid** editing files under `addons/gut/` — treat the addon as
  read-only third-party code.
- **Avoid** renaming the main scene without updating `project.godot`.
