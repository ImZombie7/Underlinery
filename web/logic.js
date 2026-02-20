// CORE ENGINE — RULEBOOK ALIGNED

const GRID_SIZE = 11;
const MAX_NUMBER = 121;

function initGrid() {
  return Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(null)
  );
}

function isValidCoordinate(r, c) {
  return (
    Number.isInteger(r) &&
    Number.isInteger(c) &&
    r >= 0 &&
    r < GRID_SIZE &&
    c >= 0 &&
    c < GRID_SIZE
  );
}

function placeNumber(grid, r, c, number) {
  if (!isValidCoordinate(r, c)) return false;
  if (!Number.isInteger(number)) return false;
  if (number < 1 || number > MAX_NUMBER) return false;
  if (grid[r][c] !== null) return false;

  // avoid grid.flat() allocation
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (grid[i][j] === number) return false;
    }
  }

  grid[r][c] = number;
  return true;
}

function crossNumber(grid, number) {
  if (!Number.isInteger(number)) return false;

  let found = false;

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === number) {
        grid[r][c] = "X";
        found = true;
      }
    }
  }

  return found;
}

function scanCompletedLines(grid) {
  const completed = { rows: 0, cols: 0, diagonals: 0 };

  for (let r = 0; r < GRID_SIZE; r++) {
    let full = true;
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] !== "X") {
        full = false;
        break;
      }
    }
    if (full) completed.rows++;
  }

  for (let c = 0; c < GRID_SIZE; c++) {
    let full = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (grid[r][c] !== "X") {
        full = false;
        break;
      }
    }
    if (full) completed.cols++;
  }

  // main diagonal
  let mainFull = true;
  for (let i = 0; i < GRID_SIZE; i++) {
    if (grid[i][i] !== "X") {
      mainFull = false;
      break;
    }
  }
  if (mainFull) completed.diagonals++;

  // anti diagonal
  let antiFull = true;
  for (let i = 0; i < GRID_SIZE; i++) {
    if (grid[i][GRID_SIZE - 1 - i] !== "X") {
      antiFull = false;
      break;
    }
  }
  if (antiFull) completed.diagonals++;

  return completed;
}

function countTicks(result) {
  return result.rows + result.cols + result.diagonals;
}
