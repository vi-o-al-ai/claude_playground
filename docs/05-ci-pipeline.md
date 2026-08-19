# Step 5: GitHub Actions CI Pipeline

## Overview

CI runs automatically on every push to `main` and every pull request targeting `main`. It validates code quality, runs the tests, checks project metadata, and verifies that everything still builds.

There are two test pipelines, split by cost. The JS suite is fast, so it runs on **everything**. The Godot suite needs a container and export templates, so it is path-filtered to its own subtree.

## CI Web (`.github/workflows/ci-web.yml`)

Three parallel jobs, Node 22, `npm ci` with `actions/setup-node`'s npm cache:

```
┌──────────────────────┐  ┌─────────────┐  ┌─────────────────┐
│ Lint & Format        │  │ Unit Tests  │  │ Build All       │
│                      │  │             │  │ Packages        │
│ eslint .             │  │ vitest run  │  │ vite build      │
│ prettier --check .   │  │ (407 tests) │  │ (×10 projects)  │
│ build-manifest       │  │             │  │                 │
│   --check            │  │             │  │                 │
└──────────────────────┘  └─────────────┘  └─────────────────┘
```

**No `paths:` filters.** That is deliberate: the suite is stack-generic and takes a couple of minutes, and adding a new project must never require editing this workflow.

### Job: Lint & Format

- ESLint across all JS files and inline `<script>` blocks in HTML
- Prettier in check mode (no auto-fix — it fails if something is unformatted)
- `node scripts/build-manifest.mjs --check` — the **metadata gate**

The metadata gate is the interesting one. It walks `{games,apps}/*/*/`, reads each project's `arcade` block (from `package.json`, or from `arcade.json` for non-npm projects), and fails if any of them is malformed — a missing or empty `title`/`emoji`/`description`, invalid JSON, or two projects in the same category claiming the same slug. A duplicate slug would mean two projects deploying to the same URL, so it is caught here rather than at deploy time.

### Job: Unit Tests

- `npm test` → `vitest run`, using the explicit `vitest.config.js` at the repo root
- Currently 407 tests across 24 files, in a few seconds
- Discovery is explicit: `{games,apps,packages,scripts}/**/__tests__/**/*.test.js`, so the repo's own tooling in `scripts/` is tested like any project
- The default environment is `node`; individual files opt into jsdom with a `// @vitest-environment jsdom` docblock

### Job: Build All Packages

- `npm run build` → `npm run build --workspaces --if-present`
- 10 of the 12 workspaces have a Vite build (`apps/node/news-digest` and `packages/shared-ui` have no build step and are skipped by `--if-present`)
- Catches broken imports, missing files, and build errors that lint and tests do not

## CI Godot (`.github/workflows/ci-godot.yml`)

One job in a `barichello/godot-ci:4.6` container, path-filtered on `games/godot/**` plus the workflow file itself. The filter is stack-generic rather than project-specific, so a second Godot project needs no workflow edit.

The job loops over `games/godot/*/`, skipping any directory without a `project.godot`:

1. **Import** each project twice. The first pass populates the resource cache; the second resolves imports that depend on it. (A well-known Godot CI quirk.)
2. **Run GUT** with `godot --headless -s res://addons/gut/gut_cmdln.gd` in each project, grouping the output per project.

Failures are collected across projects and reported together at the end, so one broken game does not hide another's results. The runner currently has 16 GUT test scripts under `games/godot/runner/tests/` (~215 test functions) covering lane switching, shooting, zombies, collisions, power-ups, touch controls, game flow, and polish.

## Deploy (`.github/workflows/deploy.yml`)

Not strictly CI, but it shares the same shape. Four jobs:

```
┌─────────────┐  ┌─────────────┐
│ build-web   │  │ build-godot │   ← in parallel
└──────┬──────┘  └──────┬──────┘
       └───────┬────────┘
               ▼
          ┌─────────┐     ┌────────┐
          │assemble │ ──► │ deploy │
          └─────────┘     └────────┘
```

- **build-web** re-runs the metadata gate, then builds every Vite project with `PAGES_BASE=/claude_playground` so `vite.shared.js` derives the right base path per project.
- **build-godot** exports every project under `games/godot/*/` to web and stages each under its directory name.
- **assemble** copies the arcade hub's build to the site root, then every other project into its namespaced slot — `_site/games/<slug>/` and `_site/apps/<slug>/` — through a helper that **exits on collision** rather than silently overwriting. That is the second line of defence behind the metadata gate.
- **deploy** publishes the artifact to GitHub Pages.

Its `paths:` filters are tree-level (`games/**`, `apps/**`, `packages/**`, `scripts/**`, plus the root build files), so any project triggers a deploy without workflow edits.

## Adding New Checks

To add a step to the JS pipeline (e.g. Playwright E2E tests), add a job to `.github/workflows/ci-web.yml`:

```yaml
e2e:
  name: E2E Tests
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 22
        cache: npm
    - run: npm ci
    - run: npx playwright install --with-deps
    - run: npm run test:e2e
```

To add a check for a **new tech stack**, add a whole new `ci-<stack>.yml` instead — see [Step 2b: Heterogeneous Tech Stacks](./02b-heterogeneous-tech-stacks.md).

## Local Equivalent

Run the same checks locally before pushing:

```bash
npm run check                            # lint + format:check + test
node scripts/build-manifest.mjs --check  # metadata gate
npm run build                            # build all packages
```

### Pre-commit Hook

A Husky pre-commit hook runs ESLint and Prettier on staged files automatically at commit time, catching most lint and formatting issues before they ever reach CI. See [Step 1: Linting & Formatting](./01-linting-and-formatting.md#pre-commit-hook-husky--lint-staged) for details.
