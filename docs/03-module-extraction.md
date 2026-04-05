# Step 3: Game Logic Module Extraction

## Overview

Game logic for **Sudoku** and **Tic-Tac-Toe** has been extracted from inline scripts into separate ES module files. This separates pure game logic (testable, no DOM) from UI rendering (DOM-dependent).

## Architecture Pattern

Each game now follows a three-layer pattern:

```
index.html          → Markup only (no inline scripts)
  └── src/ui.js     → DOM rendering, event handlers, timer
       └── src/engine.js      → Pure game logic (testable)
            src/game-state.js  → State management (testable, Sudoku only)
```

**The key principle:** `engine.js` and `game-state.js` have zero DOM access. They take data in, return data out. This makes them fully unit-testable without a browser environment.

## Sudoku

### File Structure

```
packages/sudoku/
├── index.html                # Markup, links to src/ui.js as ES module
├── style.css                 # Unchanged
├── src/
│   ├── engine.js             # Puzzle generation, solving, validation, encoding
│   ├── game-state.js         # State management: moves, hints, undo, serialization
│   └── ui.js                 # DOM rendering, event handlers, timer, modals
├── sudoku.js                 # Legacy (kept for reference, not loaded)
└── game.js                   # Legacy (kept for reference, not loaded)
```

### What's in Each Module

**`engine.js`** (pure logic, zero dependencies):

- `isValid(board, row, col, num)` — check if a number placement is valid
- `solve(board, randomize)` — backtracking solver
- `countSolutions(board, limit)` — uniqueness checker
- `generate(difficulty)` — puzzle generator with unique solutions
- `getCandidates(board, row, col)` — valid numbers for a cell
- `encode/decode()` — puzzle sharing via URL
- `clone(board)` — deep copy a board

**`game-state.js`** (state management, imports only engine.js):

- `createGameState(difficulty)` — create initial state
- `newGame(state)` — generate and set up a new puzzle
- `enterNumber(state, num)` — returns `{ type: 'correct'|'mistake'|'win'|'game_over'|'note' }`
- `erase(state)`, `undo(state)`, `useHint(state)` — player actions
- `moveSelection(state, direction)` — arrow key navigation
- `getHighlightInfo(state)` — compute which cells to highlight
- `getNumpadCompletion(state)` — which numbers are complete
- `serializeState/deserializeState()` — save/load support
- `formatTime(secs)` — timer formatting

**`ui.js`** (DOM-dependent, imports game-state.js):

- Renders the board, handles clicks and keyboard
- Manages timer intervals
- Shows modals (win, game over, share)
- Handles save/load to localStorage

### Testability Examples

```js
import { isValid, generate, solve } from "./src/engine.js";

// Test puzzle generation produces valid puzzles
const { puzzle, solution } = generate("easy");
assert(puzzle.flat().filter((n) => n === 0).length === 36);

// Test solver
const board = Array.from({ length: 9 }, () => Array(9).fill(0));
assert(solve(board) === true);

// Test validation
assert(isValid(board, 0, 0, board[0][1]) === false); // same row conflict
```

## Tic-Tac-Toe

### File Structure

```
packages/tic-tac-toe/
├── index.html          # Markup, links to src/ui.js as ES module
└── src/
    ├── engine.js       # Win detection, computer AI, game state
    └── ui.js           # DOM rendering, event handlers
```

### What's in Each Module

**`engine.js`** (pure logic):

- `WIN_LINES` — the 8 possible winning combinations
- `createGameState()` — create initial state
- `checkWin(board)` — returns winning line or null
- `isBoardFull(board)` — draw detection
- `makeMove(state, i)` — returns `{ result: 'win'|'draw'|'continue', winLine, winner }`
- `findWinningMove(board, player)` — find a move that wins/blocks
- `computeComputerMove(board)` — AI strategy (win > block > center > corner > any)
- `restart(state)` — reset board keeping scores

**`ui.js`** (DOM-dependent):

- Renders the board, handles clicks
- Manages computer move delay (setTimeout)
- Updates scores and status text
- Exposes `restart()` and `toggleMode()` to onclick handlers

### Testability Examples

```js
import { createGameState, makeMove, checkWin, computeComputerMove } from "./src/engine.js";

// Test win detection
const state = createGameState();
makeMove(state, 0); // X
makeMove(state, 3); // O
makeMove(state, 1); // X
makeMove(state, 4); // O
const result = makeMove(state, 2); // X wins
assert(result.result === "win");
assert(result.winLine.toString() === "0,1,2");

// Test computer blocks
const board = ["X", "X", "", "", "O", "", "", "", ""];
assert(computeComputerMove(board) === 2); // blocks X's win
```

## Vite Build Results

Before extraction, Vite copied JS files as-is (no bundling):

```
# Before
dist/index.html  3.96 kB  (JS not bundled)
```

After extraction, Vite properly bundles ES modules:

```
# Sudoku - After
dist/index.html                  3.96 kB
dist/assets/index-CaVV0cPj.css  6.86 kB
dist/assets/index-SdVLe0iL.js  13.85 kB  ← bundled + minified

# Tic-Tac-Toe - After
dist/index.html                3.64 kB
dist/assets/index-qoxmKMpV.js  2.99 kB  ← bundled + minified
```

## Design Decisions

1. **State object pattern** — Game state is a plain object passed to functions. No classes, no `this`. Easy to serialize, test, and inspect.
2. **Result objects from mutations** — `enterNumber()` returns `{ type: 'correct'|'mistake'|... }` so the UI knows what happened without checking state diffs.
3. **Legacy files kept** — `sudoku.js` and `game.js` remain for reference but are no longer loaded. They can be removed once the new modules are fully validated.
4. **`window.restart/toggleMode`** — Tic-Tac-Toe's HTML uses `onclick="restart()"`. Rather than refactoring the HTML, the UI module assigns these to `window`. This is pragmatic for now; future steps could move to `addEventListener`.
