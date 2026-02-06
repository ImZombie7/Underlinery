// CORE LOGIC FREEZE — v1.0
// Changes require rulebook update

// logic.js

const GRID_SIZE = 11;

function initGrid() {
  return Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(null)
  );
}

function placeNumber(grid, r, c, number) {
  if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
  if (number < 1 || number > 121) return false;
  if (grid[r][c] !== null) return false;
  if (grid.flat().includes(number)) return false;

  grid[r][c] = number;
  return true;
}

function scanCompletedLines(grid) {
  const completed = { rows: [], cols: [], diagonals: [] };

  for (let r = 0; r < GRID_SIZE; r++) {
    if (grid[r].every(v => v !== null)) completed.rows.push(r);
  }

  for (let c = 0; c < GRID_SIZE; c++) {
    if (grid.every(row => row[c] !== null)) completed.cols.push(c);
  }

  if (grid.every((row, i) => row[i] !== null))
    completed.diagonals.push("main");

  if (grid.every((row, i) => row[GRID_SIZE - 1 - i] !== null))
    completed.diagonals.push("anti");

  return completed;
}
