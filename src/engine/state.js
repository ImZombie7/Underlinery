export const GRID_SIZE = 11;
export const MAX_NUMBER = 121;
export const TURN_TIME_MS = 45000;
export const RECONNECT_GRACE_MS = 30000;

export function createPlayer() {
  return {
    grid: Array.from({ length: GRID_SIZE }, () =>
      Array(GRID_SIZE).fill(null)
    ),
    ticks: 0,
    placementCount: 0,
    locked: false,
    usedNumbers: new Set()
  };
}

export function createInitialState() {
  return {
    version: 0,
    phase: "placement",
    currentPlayer: null,
    calledNumbers: new Set(),
    winner: null,
    players: [createPlayer(), createPlayer()]
  };
}