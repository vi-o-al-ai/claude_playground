# Web Games

Vite + Vanilla JS browser games.

## Architecture

Each game follows engine.js (pure game logic) + ui.js (DOM/Canvas rendering) separation. Game configs use `createProjectConfig()` from the root `vite.shared.js`, which derives the dev-server port from the directory name.

## Shared UI

Most games depend on `@ai-arcade/shared-ui` for consistent components: GameHeader, GameOver, Modal, and theme CSS.

## Testing

Tests go in `src/__tests__/*.test.js` using Vitest + jsdom.

## Dev Server

```bash
npm run dev -w games/web/<name>
```
