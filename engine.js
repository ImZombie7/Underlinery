// engine.js

const GRID_SIZE = 11;
const MAX_NUMBER = 121;

function initGrid() {
  return Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(null)
  );
}

function createInitialState() {
  return {
    phase: "placement", // placement | match | gameover
    currentPlayer: 0,
    calledNumbers: [],
    winner: null,
    players: [
      { grid: initGrid(), ticks: 0, placementCount: 0, locked: false },
      { grid: initGrid(), ticks: 0, placementCount: 0, locked: false }
    ]
  };
}

function isValidCoord(r, c) {
  return Number.isInteger(r) &&
    Number.isInteger(c) &&
    r >= 0 && r < GRID_SIZE &&
    c >= 0 && c < GRID_SIZE;
}

function placeNumber(state, playerIndex, r, c, number) {
  if (state.phase !== "placement") return false;
  if (state.currentPlayer !== playerIndex) return false;

  const player = state.players[playerIndex];
  if (player.locked) return false;

  if (!Number.isInteger(number)) return false;
  if (number < 1 || number > MAX_NUMBER) return false;
  if (!isValidCoord(r, c)) return false;
  if (player.grid[r][c] !== null) return false;

  // prevent duplicates
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (player.grid[i][j] === number) return false;
    }
  }

  player.grid[r][c] = number;
  player.placementCount++;

  if (player.placementCount === 121) {
    player.locked = true;
  }

  if (state.players.every(p => p.locked)) {
    state.phase = "match";
    state.currentPlayer = 0;
  } else {
    state.currentPlayer = 1 - state.currentPlayer;
  }

  return true;
}

function callNumber(state, playerIndex, number) {
  if (state.phase !== "match") return false;
  if (state.currentPlayer !== playerIndex) return false;
  if (!Number.isInteger(number)) return false;
  if (state.calledNumbers.includes(number)) return false;

  state.calledNumbers.push(number);

  state.players.forEach(p => {
    crossNumber(p.grid, number);
  });

  state.players.forEach(p => {
    const result = scanLines(p.grid);
    p.ticks = result;
  });

  for (let i = 0; i < 2; i++) {
    if (state.players[i].ticks >= 11) {
      state.phase = "gameover";
      state.winner = i;
      return true;
    }
  }

  state.currentPlayer = 1 - state.currentPlayer;
  return true;
}

function crossNumber(grid, number) {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === number) {
        grid[r][c] = "X";
      }
    }
  }
}

function scanLines(grid) {
  let ticks = 0;

  for (let r = 0; r < GRID_SIZE; r++) {
    if (grid[r].every(v => v === "X")) ticks++;
  }

  for (let c = 0; c < GRID_SIZE; c++) {
    let full = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (grid[r][c] !== "X") { full = false; break; }
    }
    if (full) ticks++;
  }

  let main = true;
  let anti = true;

  for (let i = 0; i < GRID_SIZE; i++) {
    if (grid[i][i] !== "X") main = false;
    if (grid[i][GRID_SIZE - 1 - i] !== "X") anti = false;
  }

  if (main) ticks++;
  if (anti) ticks++;

  return ticks;
}

module.exports = {
  createInitialState,
  placeNumber,
  callNumber
};
