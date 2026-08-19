# Arcade Hub

Landing page that links to every deployable game and app. No game logic.

## Cards are generated, never hand-written

- `scripts/build-manifest.mjs` scans `{games,apps}/*/*/` and writes
  `src/manifest.json` (gitignored). It runs automatically via the `predev` and
  `prebuild` scripts.
- `src/main.js` imports that manifest — Vite inlines it at build time, no
  runtime fetch — and renders one card per entry into the Games and Apps
  sections of `index.html`.
- To appear on the hub, a project declares an `arcade` object
  (`{ title, emoji, description }`) in its `package.json`, or in an
  `arcade.json` for non-npm projects such as the Godot runner. Category comes
  from the tree: `games/*` → Games, `apps/*` → Apps. A project with no
  metadata (this hub, the CI-only `apps/node/news-digest`) is skipped.
- Never hand-edit cards in `index.html`; edit the owning project's metadata.
- `node scripts/build-manifest.mjs --check` validates metadata without writing.

## Other notes

- Deploys at the site root (`siteRoot: true` in `vite.config.js`); card links
  are relative (`./games/<slug>/`, `./apps/<slug>/`).
- Includes a PWA service worker (`public/sw.js`) for offline support. Its
  `public/manifest.json` is the PWA manifest — unrelated to the generated
  `src/manifest.json`.
- No `@ai-arcade/shared-ui` dependency.
