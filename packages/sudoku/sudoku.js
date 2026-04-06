/**
 * Sudoku engine: generation, solving, and validation.
 * Generates puzzles by building a complete solution then removing cells.
 */
const Sudoku = (() => {
  // Shuffle array in-place (Fisher-Yates)
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Check if placing num at (row, col) is valid
  function isValid(board, row, col, num) {
    for (let i = 0; i < 9; i++) {
      if (board[row][i] === num) return false;
      if (board[i][col] === num) return false;
    }
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if (board[r][c] === num) return false;
      }
    }
    return true;
  }

  // Solve board using backtracking with randomized candidates
  function solve(board, randomize = false) {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] !== 0) continue;
        const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        if (randomize) shuffle(nums);
        for (const num of nums) {
          if (isValid(board, row, col, num)) {
            board[row][col] = num;
            if (solve(board, randomize)) return true;
            board[row][col] = 0;
          }
        }
        return false;
      }
    }
    return true;
  }

  // Count solutions (stop at 2 for uniqueness check)
  function countSolutions(board, limit = 2) {
    let count = 0;
    function helper() {
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          if (board[row][col] !== 0) continue;
          for (let num = 1; num <= 9; num++) {
            if (isValid(board, row, col, num)) {
              board[row][col] = num;
              helper();
              board[row][col] = 0;
              if (count >= limit) return;
            }
          }
          return;
        }
      }
      count++;
    }
    helper();
    return count;
  }

  // Generate a complete solved board
  function generateSolution() {
    const board = Array.from({ length: 9 }, () => Array(9).fill(0));
    solve(board, true);
    return board;
  }

  // Clone a board
  function clone(board) {
    return board.map((row) => [...row]);
  }

  // Difficulty settings: how many cells to remove
  const DIFFICULTY_REMOVALS = {
    easy: 36,
    medium: 45,
    hard: 52,
    expert: 58,
  };

  // Generate a puzzle with unique solution
  function generate(difficulty = "medium") {
    const solution = generateSolution();
    const puzzle = clone(solution);
    const removals = DIFFICULTY_REMOVALS[difficulty] || 45;

    // Create list of all positions and shuffle
    const positions = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        positions.push([r, c]);
      }
    }
    shuffle(positions);

    let removed = 0;
    for (const [r, c] of positions) {
      if (removed >= removals) break;
      const backup = puzzle[r][c];
      puzzle[r][c] = 0;

      // Check uniqueness
      const testBoard = clone(puzzle);
      if (countSolutions(testBoard) === 1) {
        removed++;
      } else {
        puzzle[r][c] = backup;
      }
    }

    return { puzzle, solution };
  }

  // Get candidates for a cell
  function getCandidates(board, row, col) {
    if (board[row][col] !== 0) return [];
    const candidates = [];
    for (let num = 1; num <= 9; num++) {
      if (isValid(board, row, col, num)) {
        candidates.push(num);
      }
    }
    return candidates;
  }

  // Encode puzzle to compact string for sharing
  function encode(puzzle, solution, difficulty) {
    const puzzleStr = puzzle.flat().join("");
    const solutionStr = solution.flat().join("");
    const data = { p: puzzleStr, s: solutionStr, d: difficulty };
    return btoa(JSON.stringify(data));
  }

  // Decode shared puzzle
  function decode(encoded) {
    try {
      const data = JSON.parse(atob(encoded));
      const puzzle = [];
      const solution = [];
      for (let r = 0; r < 9; r++) {
        puzzle.push([]);
        solution.push([]);
        for (let c = 0; c < 9; c++) {
          const i = r * 9 + c;
          puzzle[r].push(parseInt(data.p[i]));
          solution[r].push(parseInt(data.s[i]));
        }
      }
      return { puzzle, solution, difficulty: data.d || "medium" };
    } catch {
      return null;
    }
  }

  return { generate, solve, isValid, getCandidates, clone, encode, decode };
})();
