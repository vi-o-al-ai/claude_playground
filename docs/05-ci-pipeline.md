# Step 5: GitHub Actions CI Pipeline

## Overview

A CI pipeline runs automatically on every push to `main` and on every pull request targeting `main`. It validates code quality, runs tests, and verifies all packages build successfully.

## Pipeline Structure

The pipeline runs **three parallel jobs**:

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Lint & Format│  │ Unit Tests  │  │ Build All   │
│             │  │             │  │ Packages    │
│ eslint .    │  │ vitest run  │  │ vite build  │
│ prettier    │  │             │  │ (×9 pkgs)   │
│  --check .  │  │             │  │             │
└─────────────┘  └─────────────┘  └─────────────┘
```

### Job: Lint & Format

- Runs ESLint across all JS/HTML files
- Verifies Prettier formatting (no auto-fix — fails if unformatted)
- Catches style issues before they reach main

### Job: Unit Tests

- Runs Vitest (`npm test`)
- 77 tests across Sudoku and Tic-Tac-Toe engines
- Completes in under 1 second

### Job: Build All Packages

- Runs `npm run build` which builds all 9 packages via Vite
- Verifies no broken imports, missing files, or build errors
- Uses `--if-present` so non-Vite packages are skipped

## Configuration

File: `.github/workflows/ci.yml`

- **Node.js 22** (LTS)
- **npm ci** for reproducible installs (uses `package-lock.json`)
- **actions/setup-node** with `cache: npm` for faster installs
- Jobs run in parallel for fast feedback

## Workflow Triggers

| Event                    | Trigger                           |
| ------------------------ | --------------------------------- |
| Push to `main`           | Runs full pipeline                |
| PR targeting `main`      | Runs full pipeline                |
| Push to feature branches | Does not run (to save CI minutes) |

## Adding New Checks

To add a new CI step (e.g., Playwright E2E tests), add a new job to `.github/workflows/ci.yml`:

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

## Local Equivalent

Run the same checks locally before pushing:

```bash
npm run check   # lint + format:check + test
npm run build   # build all packages
```
