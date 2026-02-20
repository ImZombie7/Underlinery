// web/main.js

const socket = new WebSocket("ws://localhost:8080");

let playerIndex = null;
let gameState = null;
let selectedCell = null;

socket.onmessage = (event) => {
  const { type, payload } = JSON.parse(event.data);

  if (type === "JOIN_GAME") {
    playerIndex = payload.playerIndex;
  }

  if (type === "GAME_STATE_UPDATE") {
    gameState = payload;
    render();
  }

  if (type === "GAME_OVER") {
    alert(`Player ${payload.winner + 1} wins.`);
  }

  if (type === "ERROR") {
    alert(payload);
  }
};

document.getElementById("actionBtn").onclick = () => {
  if (!gameState) return;
  if (gameState.phase === "gameover") return;

  const number = parseInt(document.getElementById("numberInput").value);
  if (!Number.isInteger(number)) return;

  if (gameState.phase === "placement") {
    if (!selectedCell) return;

    socket.send(JSON.stringify({
      type: "PLACE_NUMBER",
      payload: {
        r: selectedCell.r,
        c: selectedCell.c,
        number
      }
    }));
  }

  if (gameState.phase === "match") {
    socket.send(JSON.stringify({
      type: "CALL_NUMBER",
      payload: { number }
    }));
  }
};

function render() {
  gameState.players.forEach((player, index) => {
    const container = document.getElementById(`grid-${index}`);
    container.innerHTML = "";

    const isActive = index === playerIndex;

    for (let r = 0; r < 11; r++) {
      for (let c = 0; c < 11; c++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");

        const value = player.grid[r][c];

        if (gameState.phase === "match" &&
            index !== playerIndex &&
            value !== "X") {
          cell.textContent = "";
        } else {
          cell.textContent = value === null ? "" : value;
        }

        if (value === "X") {
          cell.classList.add("marked");
        }

        if (gameState.phase === "placement" &&
            index === playerIndex &&
            value === null) {
          cell.onclick = () => {
            selectedCell = { r, c };
          };
        }

        container.appendChild(cell);
      }
    }

    document.getElementById(`ticks-${index}`).textContent =
      `Ticks: ${player.ticks}`;
  });

  document.getElementById("called-numbers").textContent =
    "Called: " + gameState.calledNumbers.join(", ");
}