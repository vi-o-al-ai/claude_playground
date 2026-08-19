# __TITLE__

__EMOJI__ __DESCRIPTION__ A Vite + Vanilla JS browser game; `vite.config.js` uses `createProjectConfig()` from the root `vite.shared.js`, so the dev port and deployed base path are derived from this directory's name (`__NAME__`). Keep pure game logic in its own module (e.g. `engine.js`) and DOM/Canvas rendering separate (e.g. `ui.js`). Tests live in `src/__tests__/*.test.js` (Vitest, jsdom via a `// @vitest-environment jsdom` docblock) and run from the repo root with `npm test`.
