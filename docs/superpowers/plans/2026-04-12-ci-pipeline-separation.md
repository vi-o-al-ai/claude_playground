# CI Pipeline Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the monolithic `ci.yml` into `ci-web.yml` (JS/Vite) and `ci-godot.yml` (Godot), each with path-based triggers so they only run when relevant files change.

**Architecture:** Replace `.github/workflows/ci.yml` with two new workflow files. Each uses GitHub Actions native `paths` filter on `on.push` and `on.pull_request`. The `deploy.yml` workflow is unchanged.

**Tech Stack:** GitHub Actions YAML

**Spec:** `docs/superpowers/specs/2026-04-12-ci-pipeline-separation-design.md`

---

### Task 1: Create `ci-web.yml`

**Files:**

- Create: `.github/workflows/ci-web.yml`

- [ ] **Step 1: Create the web CI workflow**

```yaml
name: CI Web

on:
  push:
    branches: [main]
    paths:
      - "games/**"
      - "!games/runner/**"
      - "apps/**"
      - "packages/**"
      - "package.json"
      - "package-lock.json"
      - "vite.shared.js"
      - "eslint.config.js"
      - ".github/workflows/ci-web.yml"
  pull_request:
    branches: [main]
    paths:
      - "games/**"
      - "!games/runner/**"
      - "apps/**"
      - "packages/**"
      - "package.json"
      - "package-lock.json"
      - "vite.shared.js"
      - "eslint.config.js"
      - ".github/workflows/ci-web.yml"

jobs:
  lint:
    name: Lint & Format
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check

  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test

  build:
    name: Build All Packages
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
```

- [ ] **Step 2: Verify YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci-web.yml'))"`
Expected: No output (valid YAML)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci-web.yml
git commit -m "ci: add ci-web.yml with path-based triggers for JS/Vite stack"
```

---

### Task 2: Create `ci-godot.yml`

**Files:**

- Create: `.github/workflows/ci-godot.yml`

- [ ] **Step 1: Create the Godot CI workflow**

```yaml
name: CI Godot

on:
  push:
    branches: [main]
    paths:
      - "games/runner/**"
      - ".github/workflows/ci-godot.yml"
  pull_request:
    branches: [main]
    paths:
      - "games/runner/**"
      - ".github/workflows/ci-godot.yml"

jobs:
  test-godot:
    name: Godot Tests
    runs-on: ubuntu-latest
    container:
      image: barichello/godot-ci:4.6
    steps:
      - uses: actions/checkout@v4
      - name: Import project
        run: |
          cd games/runner
          godot --headless --import 2>&1 || true
          godot --headless --import 2>&1 || true
      - name: Run GUT tests
        run: |
          cd games/runner
          godot --headless -s res://addons/gut/gut_cmdln.gd 2>&1
```

- [ ] **Step 2: Verify YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci-godot.yml'))"`
Expected: No output (valid YAML)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci-godot.yml
git commit -m "ci: add ci-godot.yml with path-based triggers for Godot stack"
```

---

### Task 3: Delete `ci.yml`

**Files:**

- Delete: `.github/workflows/ci.yml`

- [ ] **Step 1: Delete the old monolithic CI workflow**

```bash
git rm .github/workflows/ci.yml
```

- [ ] **Step 2: Commit**

```bash
git commit -m "ci: remove monolithic ci.yml, replaced by ci-web.yml and ci-godot.yml"
```

---

### Task 4: Update CLAUDE.md

**Files:**

- Modify: `CLAUDE.md`

The CI/CD section references `ci.yml` — update it to reflect the new workflow names.

- [ ] **Step 1: Update the CI/CD section**

Replace the current CI/CD section:

```markdown
## CI/CD

- **CI Web** (`.github/workflows/ci-web.yml`): lint, format check, vitest, build. Triggers on JS/Vite file changes. Node 22.
- **CI Godot** (`.github/workflows/ci-godot.yml`): GUT tests in `barichello/godot-ci:4.6` container. Triggers on `games/runner/` changes.
- **Deploy** (`.github/workflows/deploy.yml`): Builds all Vite apps + exports Godot runner to web, assembles into GitHub Pages site at `/claude_playground/`.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md CI/CD section for split workflows"
```

---

### Task 5: Verify workflows on a test branch

- [ ] **Step 1: Check that all workflow files are valid and deploy.yml is unchanged**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci-web.yml')); yaml.safe_load(open('.github/workflows/ci-godot.yml')); yaml.safe_load(open('.github/workflows/deploy.yml')); print('All valid')"
```

Expected: `All valid`

- [ ] **Step 2: Verify ci.yml is gone**

```bash
ls .github/workflows/
```

Expected output should show: `ci-godot.yml`, `ci-web.yml`, `deploy.yml` (no `ci.yml`)

- [ ] **Step 3: Verify path filters cover all JS game directories**

```bash
ls games/ | grep -v runner
```

Expected: `arcade-hub`, `solitaire`, `space-invaders`, `splendor`, `sudoku`, `tic-tac-toe` — all matched by `games/**` with `!games/runner/**` exclusion.
