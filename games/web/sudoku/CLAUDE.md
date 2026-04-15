# Sudoku

Puzzle game with difficulty levels, undo, notes, hints, save/resume, and share.

## Legacy Scripts

Has non-module scripts (`sudoku.js`, `game.js`) alongside the modern Vite setup. ESLint has special config for these files (globals `Sudoku`, `Game`).

## State Management

`game-state.js` handles persistent state via localStorage (save/load/resume).

## Testing

Tests in `src/__tests__/engine.test.js`.
