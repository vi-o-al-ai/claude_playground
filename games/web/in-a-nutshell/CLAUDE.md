# In a Nutshell

Party word-guessing game: clue words are revealed one at a time and players race to guess the hidden answer.

- `engine.js` -- pure game logic (immutable state; every mutating function returns a new state).
- `deck.js` -- the card deck (answers, clues, aliases).
- `main.js` -- DOM rendering and event handling.
- Uses `@ai-arcade/shared-ui`.
- Tests in `src/__tests__/engine.test.js`.
