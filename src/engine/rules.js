import { GRID_SIZE, MAX_NUMBER } from "./state.js";

export function placeNumber(state, playerIndex, r, c, number) {
  if (state.phase !== "placement") return false;

  const player = state.players[playerIndex];

  if (!Number.isInteger(number) || number < 1 || number > MAX_NUMBER)
    return false;

  if (
    !Number.isInteger(r) || r < 0 || r >= GRID_SIZE ||
    !Number.isInteger(c) || c < 0 || c >= GRID_SIZE
  ) return false;

  if (player.locked) return false;
  if (player.grid[r][c] !== null) return false;
  if (player.usedNumbers.has(number)) return false;

  player.grid[r][c] = number;
  player.usedNumbers.add(number);
  player.placementCount++;
  state.version++;
  return true;
}

export function lockGrid(state, playerIndex) {
  if (state.phase !== "placement") return false;

  const player = state.players[playerIndex];
  if (player.locked) return false;
  if (player.placementCount !== MAX_NUMBER) return false;

  player.locked = true;

  if (state.players.every(p => p.locked)) {
    state.phase = "toss";
  }

  state.version++;
  return true;
}

export function performToss(state) {
  if (state.phase !== "toss") return false;

  state.currentPlayer = Math.random() < 0.5 ? 0 : 1;
  state.phase = "match";
  state.version++;
  return true;
}

export function callNumber(state, playerIndex, number) {
  if (state.phase !== "match") return false;
  if (state.currentPlayer !== playerIndex) return false;
  if (!Number.isInteger(number) || number < 1 || number > MAX_NUMBER)
    return false;
  if (state.calledNumbers.has(number)) return false;

  state.calledNumbers.add(number);

  state.players.forEach(p => {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (p.grid[r][c] === number) {
          p.grid[r][c] = "X";
        }
      }
    }
    p.ticks = scanLines(p.grid);
  });

  for (let i = 0; i < 2; i++) {
    if (state.players[i].ticks >= 11) {
      state.phase = "gameover";
      state.winner = i;
    }
  }

  if (state.phase !== "gameover") {
    state.currentPlayer = 1 - state.currentPlayer;
  }

  state.version++;
  return true;
}

function scanLines(grid) {
  let ticks = 0;

  for (let r = 0; r < GRID_SIZE; r++)
    if (grid[r].every(v => v === "X")) ticks++;

  for (let c = 0; c < GRID_SIZE; c++) {
    let full = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (grid[r][c] !== "X") {
        full = false;
        break;
      }
    }
    if (full) ticks++;
  }

  let main = true, anti = true;
  for (let i = 0; i < GRID_SIZE; i++) {
    if (grid[i][i] !== "X") main = false;
    if (grid[i][GRID_SIZE - 1 - i] !== "X") anti = false;
  }

  if (main) ticks++;
  if (anti) ticks++;

  return ticks;
}