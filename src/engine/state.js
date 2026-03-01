// ================================
// Game Configuration
// ================================

export const GRID_SIZE = 11;
export const MAX_NUMBER = GRID_SIZE * GRID_SIZE; // 121
export const TURN_TIME_MS = 45000;
export const RECONNECT_GRACE_MS = 30000;


// ================================
// Player Factory
// ================================

export function createPlayer() {
  return {
    grid: Array.from({ length: GRID_SIZE }, () =>
      Array(GRID_SIZE).fill(null)
    ),

    usedNumbers: new Set(),  // Engine-only structure
    placementCount: 0,
    locked: false,

    ticks: 0
  };
}


// ================================
// Game State Factory
// ================================

export function createInitialState() {
  return {
    // Versioning (Engine-owned)
    version: 0,

    // Phase lifecycle:
    // "placement" → "toss" → "match" → "gameover"
    phase: "placement",

    // Match state
    currentPlayer: null,
    turnStartedAt: null,   // Forward-compatible for v1 turn enforcement

    // Game progress
    calledNumbers: new Set(),
    winner: null,

    // Players
    players: [createPlayer(), createPlayer()]
  };
}