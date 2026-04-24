# CLAUDE.md — `@ai-arcade/timeline-tracker`

Real-time activity timeline tracker. Unlike every other Vite package in
the repo, **all logic is inline inside `index.html`**. See root
[`REPO_MAP.md`](../../../REPO_MAP.md).

## Purpose and scope

- **Does:** let a user start/stop/label activity entries on a live
  timeline, persist them to localStorage, and import/export JSON.
- **Does NOT:** multi-device sync, analytics, or anything requiring a
  backend. It is single-origin, single-browser.

## Run, test, lint, build

```bash
# Dev server
npm run dev --workspace @ai-arcade/timeline-tracker

# Build
npm run build --workspace @ai-arcade/timeline-tracker

# Lint/format (from repo root)
npm run lint             # eslint-plugin-html lints the inline <script>
npm run format:check

# Tests: none. Cannot be unit-tested in its current inline form.
```

## Key files

| File             | Role                                                   |
|------------------|--------------------------------------------------------|
| `index.html`     | ~15 KB — markup, inline `<style>`, inline `<script>`.  |
| `vite.config.js` | Uses root `createGameConfig({ root })`.                |
| `package.json`   | No dependencies; Vite scripts only.                    |

No `src/` directory exists.

## Boundary rules

- **Owns:** everything under `apps/web/timeline-tracker/`.
- **Consumes:** nothing. No `@arcade/shared-ui` dependency; no runtime
  imports.
- **Must never import:** from other workspaces, full stop. This is an
  intentionally zero-dep single-file app.
- **Must never:** be the reason `eslint.config.js` grows its
  `varsIgnorePattern`. Prefer `addEventListener` wiring over inline
  `onclick` so the ESLint carve-out (`eslint.config.js:99`) can shrink.

## Sharp edges

- **Logic is inline in `index.html`.** No `src/engine.js` split exists,
  so unit testing requires either (a) extracting the logic (see
  [IMPROVEMENTS.md](../../../IMPROVEMENTS.md) item 38) or (b) a
  browser-in-the-loop test harness.
- **localStorage schema is implicit.** There is no version marker, no
  migration. If the shape changes, old data silently breaks. See
  IMPROVEMENTS.md item 39.
- **Function names used by inline `onclick` attributes are pinned in
  `eslint.config.js:99`** (`importData`, `exportData`, `resetTimeline`,
  `confirmAction`, `elapsedInterval`, …). Adding a new handler means
  editing that whitelist.
- **Import accepts any JSON.** Server-side validation does not exist;
  `importData` needs defensive parsing (verify current behavior before
  changing).

## Extraction status

**Candidate for extraction.** Has zero imports into or out of the
monorepo today. Extraction friction is only tooling (Vite+ESLint+
Prettier config); code-wise it can drop into any static host.

## When working here

- **Do** consider extracting the inline `<script>` into `src/engine.js`
  (pure) + `src/ui.js` (DOM wiring) before any significant change, so
  the new code is unit-testable.
- **Do** add a `version` field to any stored blob the next time you
  change the data shape, and branch `importData`/`loadFromStorage` on
  it.
- **Do** prefer `addEventListener` for any new buttons; leave legacy
  `onclick` handlers alone unless you're doing the extraction above.
- **Avoid** introducing a runtime dependency — the zero-dep property is
  part of the app's identity.
- **Avoid** rewriting to use `@arcade/shared-ui` without first doing the
  engine/ui split; coupling inline-HTML to a component library makes
  things worse, not better.
