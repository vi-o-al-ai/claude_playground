# CLAUDE.md — `@ai-arcade/arcade-hub`

Landing page + PWA shell for the arcade. See root
[`REPO_MAP.md`](../../../REPO_MAP.md).

## Purpose and scope

- **Does:** render the deployed root page at
  `/claude_playground/arcade-hub/` with a card grid linking to every
  game; register a service worker that caches the shell for offline use.
- **Does NOT:** contain game logic, share code with games, or coordinate
  deployments. Links are static relative hrefs resolved by GitHub Pages
  layout.

## Run, test, lint, build

```bash
# Dev server (hub only — cross-game links will 404 locally)
npm run dev --workspace @ai-arcade/arcade-hub

# Build
npm run build --workspace @ai-arcade/arcade-hub

# Lint / format (from repo root)
npm run lint
npm run format:check

# No tests. No Vitest config. No assertions on the SW.
```

## Key files

| File                    | Role                                             |
|-------------------------|--------------------------------------------------|
| `index.html`            | The landing page. Inline `<style>`, SW register. |
| `public/sw.js`          | Cache-first service worker with runtime caching. |
| `public/manifest.json`  | PWA manifest (installable).                      |
| `public/icons/`         | PWA icons pre-cached by `sw.js:18-24`.           |
| `vite.config.js`        | Uses root `createGameConfig({ root })`.          |

## Boundary rules

- **Owns:** everything under `games/web/arcade-hub/`.
- **Consumes:** nothing at build time. At runtime, hyperlinks to sibling
  game build outputs via relative paths (`../<name>/index.html`) that
  only resolve under the assembled `_site/` deploy layout.
- **Must never import:** from any other workspace. This package is the
  one sibling that explicitly does not use `@arcade/shared-ui` — do not
  add a dependency without an ADR/discussion.

## Sharp edges

- **Game catalog is hardcoded** in `index.html:109-145` (name, icon,
  href per game). Adding a new game requires a manual edit here; there
  is no generator. See [IMPROVEMENTS.md](../../../IMPROVEMENTS.md) item 7.
- **Dev-server cross-game nav is broken.** Running
  `npm run dev --workspace @ai-arcade/arcade-hub` serves only the hub;
  links like `href="../space-invaders/index.html"` 404 until you deploy
  or manually `vite preview` every game. Test the hub in
  `npm run build` + `vite preview` if you care about link integrity.
- **Service worker caches *all* same-origin GETs** once visited
  (`public/sw.js:60-78`). Deployed on GitHub Pages this ends up caching
  every game on the origin, which is intentional but cross-cuts every
  other package's offline behavior.
- **`CACHE_VERSION = "v2"`** in `public/sw.js:14`. Bump when shell files
  change, otherwise old clients keep stale assets indefinitely.

## Extraction status

**Candidate for extraction — but low priority.** Has no code deps, but
is semantically the "front door" assembled on top of all sibling
builds. Useful as a standalone static site only if you bring deploy.yml
with it (or replace the `../<name>/` hrefs with absolute URLs).

## When working here

- **Do** keep the hub dependency-free. It is the one opt-out from
  `@arcade/shared-ui` and that simplicity is intentional.
- **Do** bump `CACHE_VERSION` in `public/sw.js` whenever you change
  shell files or the manifest.
- **Do** mirror new games in both `index.html` *and* the root
  `games/web/` directory — missing either is a silent breakage.
- **Avoid** adding runtime JS modules here. If you need logic, reconsider
  the boundary — that code probably belongs in `@arcade/shared-ui` or
  in a dedicated package.
- **Avoid** caching cross-origin or `POST` requests in the SW — the
  current cache-first strategy assumes same-origin static assets only.
