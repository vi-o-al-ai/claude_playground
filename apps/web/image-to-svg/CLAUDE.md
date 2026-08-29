# Image to SVG

🖼️ Convert raster images into scalable vector SVGs, right in the browser. A Vite + Vanilla JS browser app; `vite.config.js` uses `createProjectConfig()` from the root `vite.shared.js`, so the dev port and deployed base path are derived from this directory's name (`image-to-svg`). Keep pure logic in its own modules and DOM rendering separate. Tests live in `src/__tests__/*.test.js` (Vitest, jsdom via a `// @vitest-environment jsdom` docblock) and run from the repo root with `npm test`.
