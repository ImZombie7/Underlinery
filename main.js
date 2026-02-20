// MAIN CONTROLLER — RULEBOOK ALIGNED

const gameState = {
  phase: "toss", // "toss" | "placement" | "match" | "gameover"
  currentPlayer: 0,
  calledNumbers: [],
  winner: null,
  players: [
    { grid: initGrid(), ticks: 0, placementCount: 0, locked: false },
    { grid: initGrid(), ticks: 0, placementCount: 0, locked: false }
  ]
};

const numberInput = document.getElementById("numberInput");
const actionBtn = document.getElementById("actionBtn");
const statusText = document.getElementById("status");
const calledNumbersDiv = document.getElementById("called-numbers");

// --- TOSS PHASE ---

function runToss() {
  const tossWinner = Math.random() < 0.5 ? 0 : 1;
  gameState.currentPlayer = tossWinner;
  gameState.phase = "placement";
  statusText.textContent = `Player ${tossWinner + 1} won toss. Placement begins.`;
}

// --- ACTION HANDLER ---

actionBtn.addEventListener("click", handleAction);

function handleAction() {
  if (gameState.phase === "gameover") return;

  const value = parseInt(numberInput.value);
  if (!Number.isInteger(value)) return;

  if (gameState.phase === "placement") {
    handlePlacement(value);
  } else if (gameState.phase === "match") {
    handleMatch(value);
  }

  numberInput.value = "";
}

// --- PLACEMENT PHASE ---

function handlePlacement(number) {
  const player = gameState.players[gameState.currentPlayer];

  if (player.locked) return;

  // Placement must be intentional: use selectedCell
  if (!selectedCell) return;

  const { r, c } = selectedCell;

  const placed = placeNumber(player.grid, r, c, number);
  if (!placed) return;

  player.placementCount++;

  if (player.placementCount === 121) {
    player.locked = true;
  }

  if (gameState.players.every(p => p.locked)) {
    gameState.phase = "match";
    gameState.currentPlayer = 0;
    statusText.textContent = "Match phase begins.";
  } else {
    switchTurn();
  }

  selectedCell = null;
  render();
}

// --- MATCH PHASE ---

function handleMatch(number) {
  if (gameState.calledNumbers.includes(number)) return;

  gameState.calledNumbers.push(number);

  // symmetric crossing
  gameState.players.forEach(p => {
    crossNumber(p.grid, number);
  });

  // per-grid tick calculation
  gameState.players.forEach(p => {
    const result = scanCompletedLines(p.grid);
    p.ticks = countTicks(result);
  });

  updateCalledNumbers();

  // win check (11 required)
  for (let i = 0; i < 2; i++) {
    if (gameState.players[i].ticks >= 11) {
      gameState.phase = "gameover";
      gameState.winner = i;
      statusText.textContent = `Player ${i + 1} wins.`;
      render();
      return;
    }
  }

  switchTurn();
  render();
}

// --- TURN SWITCH ---

function switchTurn() {
  gameState.currentPlayer = gameState.currentPlayer === 0 ? 1 : 0;
  statusText.textContent = `Player ${gameState.currentPlayer + 1}'s turn.`;
}

// --- RENDER ---

let selectedCell = null;

function render() {
  gameState.players.forEach((player, index) => {
    const container = document.getElementById(`grid-${index}`);
    container.innerHTML = "";

    const isActive = index === gameState.currentPlayer;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");

        const value = player.grid[r][c];

        // Hidden information enforcement
        if (
          gameState.phase === "match" &&
          !isActive &&
          value !== "X"
        ) {
          cell.textContent = "";
        } else {
          cell.textContent = value === null ? "" : value;
        }

        if (value === "X") {
          cell.classList.add("marked");
        }

        // placement selection only during placement
        if (
          gameState.phase === "placement" &&
          isActive &&
          value === null
        ) {
          cell.addEventListener("click", () => {
            selectedCell = { r, c };
          });
        }

        container.appendChild(cell);
      }
    }

    document.getElementById(`ticks-${index}`).textContent =
      `Ticks: ${player.ticks}`;
  });
}

function updateCalledNumbers() {
  calledNumbersDiv.textContent =
    "Called: " + gameState.calledNumbers.join(", ");
}

// --- INIT ---

runToss();
render();
