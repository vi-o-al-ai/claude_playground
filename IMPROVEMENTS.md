# IMPROVEMENTS.md

Findings grouped by sub-project, then repo-wide. Each item is tagged
`[quick-win | medium | structural]` and `[safe | risky]`.

Legend:

- **quick-win**: a short PR, low reviewer cost.
- **medium**: touches multiple files or requires judgement.
- **structural**: re-thinks a boundary, changes CI shape, or moves code
  across packages.
- **safe**: no runtime behavior change; type/test-visible only.
- **risky**: changes shipping behavior, deploy URLs, or CI semantics.

---

## Repo-wide

1. **[medium | safe] Two npm scopes with no documented rule.** Nine
   packages are `@ai-arcade/*` but the shared library is `@arcade/shared-ui`.
   Decide on one scope and rename. Evidence: `packages/shared-ui/package.json:2`
   vs. every other `package.json`. Consequence: a new contributor has to
   memorize two scopes; import statements read inconsistently.

2. **[medium | safe] `npm run test` runs all workspaces on every change.**
   `package.json:20` is a bare `vitest run` from the root. In CI
   (`.github/workflows/ci-web.yml`) this runs even when only Godot files
   changed in a PR that *also* touches a shared file. Vitest supports
   workspace-scoped runs (`vitest --project`) and turborepo-style filtering
   if/when the package count grows.

3. **[structural | risky] CI path filters do not match deploy path
   filters.** `ci-web.yml` includes `apps/**` (both web and node), but
   `deploy.yml` only copies `games/web/*/dist/` and `apps/web/*/dist/`
   (`deploy.yml:59-65`). `apps/node/news-digest` correctly has no build,
   but changes to it still run the full web `build` job. Either
   (a) narrow `ci-web.yml` paths to exclude `apps/node/**`, or (b) accept
   the over-trigger and document it.

4. **[quick-win | safe] ESLint `curly: ["error", "multi-line"]` conflicts
   with `eslint-config-prettier` intent.** `eslint.config.js:56` enforces
   `curly` but `eslint-config-prettier` is loaded after the recommended
   preset (`:74`). Not a bug today because `curly` is a stylistic rule
   Prettier doesn't touch, but listing stylistic rules after the
   prettier-disable layer makes intent clearer.

5. **[medium | safe] Browser globals list is hand-maintained at
   `eslint.config.js:5-50`.** Any new web API (e.g. `ResizeObserver`,
   `WebSocket`) requires an edit here instead of using
   `globals.browser` from the `globals` npm package. Adding `globals` as a
   dev dependency eliminates the maintenance.

6. **[quick-win | safe] `fake-indexeddb` is listed at the root** but only
   `splendor/asset-store` uses it. Move it to that package so the dep
   surface is self-describing. Root: `package.json:54`.

7. **[structural | risky] Arcade-hub hardcodes the game catalog.**
   `games/web/arcade-hub/index.html:109-145` lists every game by name,
   icon, and relative href. Adding a game means editing this file; removing
   one silently leaves a dead link. A generated `games.json` built by the
   assemble step of `deploy.yml` would remove the silent-failure mode and
   make arcade-hub a real index instead of a manually-curated one.

8. **[medium | safe] Dead code directory / config entry in Sudoku.**
   `games/web/sudoku/sudoku.js` (170 lines) and `games/web/sudoku/game.js`
   (617 lines) are not loaded — `index.html:113` only sources
   `src/ui.js`. ESLint still carries special rules for them
   (`eslint.config.js:117`). Remove the files and the ESLint block.
   `docs/03-module-extraction.md` §"Design Decisions #3" explicitly flags
   they can go.

9. **[structural | risky] PeerJS is a CDN-loaded global in Splendor.**
   `games/web/splendor/index.html:7` loads
   `https://unpkg.com/peerjs@1.5.4/...`; `src/network.js:228` references
   the global `Peer`. This means (a) offline and airplane builds break
   silently, (b) the version is pinned in HTML but not in
   `package-lock.json`, (c) ESLint needs the comment at
   `eslint.config.js:49` (`Peer: "readonly"`) to compile. Import `peerjs`
   via npm so it's bundled and pinned.

10. **[quick-win | safe] `eslint-plugin-html` `varsIgnorePattern` is a
    giant hardcoded regex.** `eslint.config.js:99` whitelists function
    names (`startGame|toggleMode|...|hideChat|elapsedInterval`) used as
    inline `onclick` handlers. Each new handler needs an edit here. Either
    switch remaining inline-handler HTML files (timeline-tracker, sudoku)
    to `addEventListener`, or document the whitelist convention.

11. **[medium | safe] No root README.** Root has `FRESH_LAPTOP_SETUP.md`
    and `CLAUDE.md` but no `README.md`. GitHub's repo page renders
    nothing project-specific. A short README pointing at REPO_MAP.md and
    the live Pages deployment would help.

12. **[medium | safe] Tests in CI do not produce coverage.** `ci-web.yml`
    runs `npm test` but not `vitest --coverage`. Given six games with
    inconsistent test coverage (three with tests, three without), surfacing
    per-package coverage would make it obvious where to invest next.

13. **[structural | risky] CI `build` job builds everything on every web
    PR.** `ci-web.yml` `Build All Packages` runs `npm run build`. For a PR
    touching only `tic-tac-toe`, Vite still builds arcade-hub, solitaire,
    space-invaders, splendor, sudoku, timeline-tracker. Fine at this size;
    will need per-package build filtering once the count grows.

14. **[quick-win | safe] `docs/02-monorepo-and-vite.md` predates the
    current `games/web/` vs `packages/` layout.** At least one doc
    (`03-module-extraction.md`) still references paths like
    `packages/sudoku/` and `packages/tic-tac-toe/`. Update or mark as
    historical.

15. **[quick-win | safe] `.prettierignore` not audited against current
    dirs.** `eslint.config.js:64-71` ignores `games/godot/runner/`; make
    sure `.prettierignore` mirrors that plus any future Godot folders. Not
    read in this pass, but the convention from
    `docs/02b-heterogeneous-tech-stacks.md` expects both sides.

---

## `@arcade/shared-ui` (`packages/shared-ui/`)

16. **[quick-win | safe] No top-level `CLAUDE.md` for this package.**
    Phase 4 of this analysis adds one. Evidence: `ls packages/shared-ui/`
    (no CLAUDE.md exists before this pass).

17. **[medium | safe] Theme CSS has no clear consumption path.**
    `package.json:10` exports `./theme → src/theme.css`, but no game
    imports it. Games get styling from their own inline CSS. Either (a)
    document that theme.css is an orphan for now, (b) delete the export,
    or (c) have each game `import "@arcade/shared-ui/theme"` at the entry
    of `ui.js`.

18. **[quick-win | safe] No `build` script.** Consumers import from
    `src/*.js` directly. Fine today, but extraction to a standalone
    package on npm would require a build step (rollup/tsup). Flag for
    extraction readiness.

19. **[structural | safe] Test gap at the boundary — zero contract tests
    against consumers.** If a `GameHeader` prop is renamed, nothing in
    `packages/shared-ui/src/__tests__/` catches that the five consumers
    still import it. A small integration test per consumer (or a typed
    API with JSDoc + `// @ts-check`) would close this.

## `@ai-arcade/arcade-hub` (`games/web/arcade-hub/`)

20. **[medium | risky] Game links depend on deployed site layout.**
    `index.html:110` uses `href="../space-invaders/index.html"`. Under
    `npm run dev --workspace @ai-arcade/arcade-hub`, Vite serves
    `arcade-hub` alone on `localhost:PORT/` and `../space-invaders/...` is
    404. Local multi-game dev requires running each game separately or
    building them all and using `vite preview`. Document this or wire up a
    single-server dev mode.

21. **[quick-win | safe] Service worker caches pages that may not be on
    the server.** `public/sw.js:26-28` pre-caches
    `['./', './index.html', './manifest.json', './icons/icon-192.png',
    './icons/icon-512.png']`. If the icons are missing (they live in
    `public/icons/`; not verified in this pass), the install event fails
    and the SW never activates. A quick `ls public/icons/` should confirm
    both PNGs exist.

22. **[structural | safe] SW belongs to arcade-hub only but has
    repo-wide implications.** The service worker caches *all* same-origin
    `GET`s at runtime (`public/sw.js:60-78`). Because deploy puts every
    game on the same origin, the arcade-hub SW ends up caching other
    games too. That's useful (offline-capable arcade) but it's a
    cross-boundary behavior that isn't documented anywhere.

## `@ai-arcade/solitaire` (`games/web/solitaire/`)

23. **[medium | safe] No tests.** `engine.js` is 205 lines of pure logic
    (deck, tableau, foundation moves) and would be straightforward to
    cover. Today `npm run check` passes with zero assertions for this game.

## `@ai-arcade/space-invaders` (`games/web/space-invaders/`)

24. **[medium | safe] No tests.** `engine.js` is 434 lines of game-loop
    logic, collision, and sprite definitions. Loop stepping is
    deterministic if `dt` is injected — testable without a browser.

25. **[quick-win | safe] Canvas-specific deviation is undocumented at the
    repo level.** Only `games/web/space-invaders/CLAUDE.md` notes the
    canvas pattern. Root `CLAUDE.md` / REPO_MAP.md should mention this as
    a supported pattern.

## `@ai-arcade/splendor` (`games/web/splendor/`)

26. **[structural | risky] PeerJS CDN coupling.** See repo-wide #9. For
    Splendor specifically, the global-`Peer` pattern at
    `src/network.js:228` means the package cannot be unit-tested without
    a DOM or a stub — and it cannot be server-side rendered, bundled
    offline, or extracted cleanly without first removing the CDN script.

27. **[medium | safe] `src/ui.js` is 788 lines and imports from four
    sibling modules.** Not a refactor request per se, but it is a god
    module candidate: it coordinates `engine`, `network`, `asset-store`,
    `asset-ui`, and `@arcade/shared-ui`. Consider splitting by feature
    (lobby UI / board UI / asset-customizer UI) if the package grows again.

28. **[medium | safe] `index.html` is 32 KB of markup.** Per `ls -la`,
    largest HTML in the repo by an order of magnitude. Any new UI addition
    either piles on here or ends up in JS-generated DOM — there's no
    templating story.

29. **[quick-win | safe] Asset-store tests exist; engine tests exist;
    network tests do not.** `src/__tests__/` has `engine.test.js` and
    `asset-store.test.js` but no `network.test.js`. Networking is the
    hardest-to-reason-about code in the repo; at minimum a round-trip test
    using a PeerJS stub would pay off.

30. **[medium | safe] `asset-store.js:BUNDLE_FORMAT = "splendor-art-bundle"`
    is a stable wire format** (shared with remote peers). Breaking changes
    need a version bump (`BUNDLE_VERSION = 1`). No migration path is
    documented.

## `@ai-arcade/sudoku` (`games/web/sudoku/`)

31. **[quick-win | safe] Remove the dead legacy scripts.** See repo-wide
    #8. `sudoku.js`, `game.js`, and the `eslint.config.js:117` carve-out
    can all go.

32. **[quick-win | safe] Split `src/ui.js` (410 lines) is borderline.**
    Not yet a problem. Watch it.

## `@ai-arcade/tic-tac-toe` (`games/web/tic-tac-toe/`)

33. **[quick-win | safe] Missing tests for `computeComputerMove()`
    randomness?** Not verified in this pass — file was not read — but
    based on `docs/03-module-extraction.md` the AI ordering is
    "win > block > center > corner > any". Exhaustive tests for each branch
    would lock the contract.

## Zombie Lane Runner (`games/godot/runner/`)

34. **[medium | safe] `main.gd` (364) and `main_strafe.gd` (354) are near
    duplicates.** They share the scene-select entry point; if stage rules
    diverge further, shared helpers in `scripts/game_constants.gd` are the
    right place (it's already referenced by filename pattern). Today
    either script is the "real" entry depending on which scene is active,
    which is load-bearing but fragile.

35. **[medium | safe] GUT addon is vendored at `addons/gut/`.** That's
    standard Godot practice, but it's ~MBs of unowned code inside a tests
    toolchain directory. Pin the version in a comment or
    `addons/gut/VERSION` so upgrades are deliberate.

36. **[structural | risky] Deploy downloads export templates on every
    run.** `deploy.yml:46-52` fetches
    `Godot_v4.6-stable_export_templates.tpz` each build. Cache to speed
    up and to survive upstream 404s.

37. **[quick-win | safe] Godot tests run in CI but never count toward
    `npm run check`.** That's by design (two different toolchains), but it
    means a local `npm run check` before push does not cover the Godot
    project. Document this explicitly in root `CLAUDE.md`.

## `@ai-arcade/timeline-tracker` (`apps/web/timeline-tracker/`)

38. **[medium | safe] Inline script can't be tested.** All app logic
    (`importData`, `exportData`, `resetTimeline`, etc. — see
    `eslint.config.js:99` whitelist) sits inside `<script>` tags in
    `index.html`. Extract to `src/engine.js` + `src/ui.js` to match the
    rest of the repo.

39. **[quick-win | safe] localStorage schema is implicit.** No migration
    story if the stored shape ever changes. A version marker in the
    stored object + a reader that handles missing keys would help.

## `@ai-arcade/news-digest` (`apps/node/news-digest/`)

40. **[quick-win | safe] `sources.schema.json` is not referenced by
    `sources.example.json`.** Adding a `$schema` pointer would let editors
    validate the example on open. Low-effort DX win.

41. **[medium | safe] Only test is a schema shape test.** The README
    (`README.md:76`) says "Update `src/__tests__/config.test.js` to
    recognize the new `type` value" when adding source types. That is the
    only CI guardrail — there's no end-to-end rehearsal of a single source
    fetch. Acceptable because runtime is Claude Code itself, not code in
    this repo, but surprising at first glance.

42. **[structural | safe] Consider an explicit `extract/` plan.** Its
    README already acknowledges it is here only to piggyback on shared
    tooling (`README.md:80`). If shared tooling for `apps/node/*` grows,
    great; if not, extracting to its own repo is low-friction and removes
    CI surface area.

---

## Cross-cutting boundary / coupling findings

- **No sub-project currently imports from another sub-project** except
  through `@arcade/shared-ui`. This is a strong extraction signal: seven
  of the ten sub-projects could be extracted with no import-graph work at
  all. (Evidence: the full import listing recorded in Phase 1 shows zero
  cross-`games/web/*` edges.)

- **The real couplings are deploy-time and documentation-time**, not
  runtime. Extraction friction comes from: arcade-hub hardcoding the
  catalog (repo-wide #7), deploy.yml assembling artifacts from every
  workspace (#3), the single root lockfile, and convention spread across
  `docs/*` / per-package `CLAUDE.md`.

- **`@arcade/shared-ui` is the only genuinely shared code.** A change
  there silently affects 5 consumers with zero integration tests (#19).
  Its extraction readiness is "high except no build step + no contract
  tests."
