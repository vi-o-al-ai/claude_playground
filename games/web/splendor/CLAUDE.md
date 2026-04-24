# CLAUDE.md — `@ai-arcade/splendor`

Online-capable port of the Splendor board game with custom art. Largest
web package in the repo (~2800 LOC). See root
[`REPO_MAP.md`](../../../REPO_MAP.md).

## Purpose and scope

- **Does:** implement Splendor rules; host/join lobbies over WebRTC
  (PeerJS); let players upload custom art bundles stored in IndexedDB
  and broadcast the host's bundle to clients for one session.
- **Does NOT:** persist games across refresh on the host side
  (in-memory only); support more than PeerJS's default signaling; run
  matchmaking — players exchange 6-character room codes out-of-band.

## Run, test, lint, build

```bash
# Dev server
npm run dev --workspace @ai-arcade/splendor

# Build
npm run build --workspace @ai-arcade/splendor

# Tests
npx vitest run games/web/splendor/src/__tests__/

# Lint/format (from repo root)
npm run lint
npm run format:check
```

## Key files

| File                            | Role                                                  |
|---------------------------------|-------------------------------------------------------|
| `index.html`                    | 32 KB of markup; `<script>` tag loads PeerJS from CDN.|
| `src/engine.js` (844 lines)     | Pure rules: gems, cards, nobles, turn resolution.     |
| `src/network.js` (437 lines)    | PeerJS WebRTC layer; host/client, reconnection.       |
| `src/asset-store.js` (555)      | IndexedDB bundle: blobs + piece→asset mappings.       |
| `src/asset-ui.js` (500)         | Art customizer UI.                                    |
| `src/ui.js` (788)               | Board rendering; orchestrates engine/network/assets.  |
| `src/presets/demo-bundle.json`  | Example art bundle bundled with the app.              |
| `src/__tests__/engine.test.js`  | Engine rules tests.                                   |
| `src/__tests__/asset-store.test.js` | IndexedDB tests via `fake-indexeddb`.             |

## Boundary rules

- **Owns:** everything under `games/web/splendor/`. Also owns the
  `splendor-art-bundle` on-disk/wire format (`asset-store.js`).
- **Consumes:**
  - `./engine.js`, `./network.js`, `./asset-store.js`, `./asset-ui.js`
    (all same-package).
  - `@arcade/shared-ui` → `GameHeader`, `GameOver`.
  - **External CDN:** `peerjs@1.5.4` via `<script>` tag in
    `index.html:7`. `Peer` is a global declared in
    `eslint.config.js:49`.
- **Must never import:** from other `games/web/*`. Do not leak PeerJS
  or IndexedDB assumptions into `@arcade/shared-ui`.
- **Must never:** change `BUNDLE_FORMAT`/`BUNDLE_VERSION` in
  `asset-store.js` without a migration — peers running old versions
  rely on it over the wire.

## Sharp edges

- **PeerJS is a CDN global**, not an npm dep. See
  [IMPROVEMENTS.md](../../../IMPROVEMENTS.md) item 9. Offline dev breaks
  silently; version bumps require editing `index.html` *and* the
  ESLint globals list.
- **Reconnection is best-effort.** `network.js` keeps
  `_disconnectedPlayers` so a dropped client can reclaim their slot,
  but if the host drops, the whole room dies.
- **Large payloads are guarded** but PeerJS's auto-chunking is assumed
  — see comments around `network.js:136`.
- **`ui.js` is a near-god-module** (788 lines) coordinating four other
  modules. Splits by feature (lobby / board / art-customizer) are
  reasonable if it grows again.
- **`index.html` is 32 KB of static markup.** No templating. New UI
  usually lands as JS-generated DOM in `ui.js`, which is fine but
  widens `ui.js` further.
- **Custom art applied from a host overlays** local mappings for that
  session only (`asset-store.js` header). The local library is never
  overwritten by a remote bundle.

## Extraction status

**Candidate — blocked on PeerJS CDN coupling.** Engine and asset-store
are cleanly testable. Network layer's global-`Peer` dependency makes
the package non-extractable without first importing `peerjs` from npm
and removing the `<script>` tag. After that, extraction is mechanical.

## When working here

- **Do** keep pure rules in `engine.js` and keep it DOM-free.
- **Do** test rule changes in `src/__tests__/engine.test.js` before
  touching `ui.js`.
- **Do** version-bump `BUNDLE_VERSION` in `asset-store.js` if the
  bundle schema changes, and add a migration path.
- **Do** add `network.test.js` (IMPROVEMENTS.md item 29) before making
  non-trivial changes to `network.js`.
- **Avoid** touching `index.html` PeerJS `<script>` without a plan to
  bundle PeerJS instead.
- **Avoid** treating `ui.js` as a dumping ground — extract a submodule
  when a coherent feature accretes 100+ lines.
- **Avoid** writing IndexedDB code outside `asset-store.js`; it is the
  single owner of the `assets` and `meta` stores.
