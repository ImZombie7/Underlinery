// CENTRALIZED GAME STATE
const gameState = {
  phase: "placement",
  currentPlayer: 0,
  players: [
    { grid: initGrid(), placementCount: 0, ticks: 0, locked: false },
    { grid: initGrid(), placementCount: 0, ticks: 0, locked: false }
  ],
  calledNumbers: [],
  winner: null
};

// RENDERING SYSTEM
function renderGrid(playerIndex) {
  const container = document.getElementById(`grid-${playerIndex}`);
  container.innerHTML = "";
  const player = gameState.players[playerIndex];
  const isActive = gameState.currentPlayer === playerIndex;

  for (let r = 0; r < 11; r++) {
    for (let c = 0; c < 11; c++) {
      const btn = document.createElement("button");
      const value = player.grid[r][c];

      // Hidden info
      if (gameState.phase === "match" && !isActive) {
        btn.textContent = value === "X" ? "X" : "";
      } else {
        btn.textContent = value ?? "";
      }

      if (gameState.phase === "placement" && isActive && !player.locked) {
        btn.onclick = () => handlePlacement(r, c);
      }

      container.appendChild(btn);
    }
  }
}

function renderAll() {
  renderGrid(0);
  renderGrid(1);

  document.getElementById("ticks-0").textContent =
    "Ticks: " + gameState.players[0].ticks;
  document.getElementById("ticks-1").textContent =
    "Ticks: " + gameState.players[1].ticks;
  document.getElementById("called-numbers").textContent =
    "Called: " + gameState.calledNumbers.join(", ");

  if (gameState.phase === "gameover") {
    alert("Winner: Player " + (gameState.winner + 1));
  }
}

// PLACEMENT PHASE HANDLER
function handlePlacement(r, c) {
  if (gameState.phase !== "placement") return;

  const player = gameState.players[gameState.currentPlayer];
  if (player.locked) return;

  const input = prompt("Enter number 1-121:");
  const num = Number(input);

  if (!Number.isInteger(num) || num < 1 || num > 121) return;

  const placed = placeNumber(player.grid, r, c, num);
  if (!placed) return;

  player.placementCount++;

  if (player.placementCount === 121) {
    player.locked = true;

    if (gameState.currentPlayer === 0) {
      gameState.currentPlayer = 1;
    } else {
      gameState.phase = "match";
      gameState.currentPlayer = 0;
    }
  }

  renderAll();
}

// MATCH PHASE LISTENER
document.addEventListener("keydown", function (e) {
  if (e.key !== "Enter") return;
  if (gameState.phase !== "match") return;
  if (gameState.phase === "gameover") return;

  handleMatchTurn();
});

function handleMatchTurn() {
  const input = prompt("Call a number:");
  const num = Number(input);

  if (!Number.isInteger(num) || num < 1 || num > 121) return;
  if (gameState.calledNumbers.includes(num)) return;

  gameState.calledNumbers.push(num);

  gameState.players.forEach((player, index) => {
    crossNumber(player.grid, num);
    const scan = scanCompletedLines(player.grid);
    player.ticks = countTicks(scan);

    if (player.ticks >= 11 && gameState.phase !== "gameover") {
      gameState.phase = "gameover";
      gameState.winner = index;
    }
  });

  if (gameState.phase !== "gameover") {
    gameState.currentPlayer = 1 - gameState.currentPlayer;
  }

  renderAll();
}

// INITIAL RENDER
renderAll();
