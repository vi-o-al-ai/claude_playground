# CI Pipeline Separation by Tech Stack

## Problem

All CI jobs run unconditionally on every push and PR. The Godot `test-godot` job pulls a heavy container image (`barichello/godot-ci:4.6`) even when only JS files changed, wasting CI minutes and slowing feedback.

## Design

Split the single `ci.yml` into **one workflow per tech stack**, each with path-based triggers. Future tech stacks add a new workflow file — no changes to existing ones.

### Workflows

#### `ci-web.yml` — JS/Vite (games, apps, shared packages)

**Triggers on changes to:**

- `games/**` (excluding `games/runner/**`)
- `apps/**`
- `packages/**`
- Root config: `package.json`, `package-lock.json`, `vite.shared.js`, `eslint.config.js`, `vitest.config.*`
- `.github/workflows/ci-web.yml`

**Jobs:** `lint`, `test`, `build` (identical to current `ci.yml`)

#### `ci-godot.yml` — Godot projects

**Triggers on changes to:**

- `games/runner/**`
- `.github/workflows/ci-godot.yml`

**Jobs:** `test-godot` (identical to current `ci.yml`)

#### `deploy.yml` — unchanged

Runs on push to `main` only. Builds everything unconditionally (both web and Godot). No path filters needed since deploys should always produce a complete site.

### Path filter mechanism

Use GitHub Actions native `paths` filter on the `on.push` and `on.pull_request` triggers. No third-party actions needed.

```yaml
on:
  push:
    branches: [main]
    paths:
      - "games/**"
      - "!games/runner/**"
      # ... etc
  pull_request:
    branches: [main]
    paths:
      - "games/**"
      - "!games/runner/**"
      # ... etc
```

### What happens when

| Files changed                     | `ci-web` | `ci-godot` | `deploy`       |
| --------------------------------- | -------- | ---------- | -------------- |
| `games/sudoku/src/engine.js`      | runs     | skips      | runs (on main) |
| `games/runner/scripts/player.gd`  | skips    | runs       | runs (on main) |
| `packages/shared-ui/src/modal.js` | runs     | skips      | runs (on main) |
| `package.json`                    | runs     | skips      | runs (on main) |
| Both JS + Godot files             | runs     | runs       | runs (on main) |
| Only `README.md` or `docs/**`     | skips    | skips      | runs (on main) |

### Deleted file

`ci.yml` is replaced by `ci-web.yml` and `ci-godot.yml`. It gets deleted.

## Out of scope

- Per-game isolation within the web stack (all JS games share lint/test/build)
- Deploy workflow changes
- Branch protection rule updates (user handles manually if needed)
