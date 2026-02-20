// server.js

const WebSocket = require("ws");
const {
  createInitialState,
  placeNumber,
  callNumber
} = require("./engine");

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });

let gameState = createInitialState();
let clients = [];
let playerMap = new Map();

function broadcast(type, payload) {
  const message = JSON.stringify({ type, payload });
  clients.forEach(ws => ws.send(message));
}

wss.on("connection", (ws) => {
  if (clients.length >= 2) {
    ws.send(JSON.stringify({ type: "ERROR", payload: "Room full" }));
    ws.close();
    return;
  }

  const playerIndex = clients.length;
  clients.push(ws);
  playerMap.set(ws, playerIndex);

  ws.send(JSON.stringify({
    type: "JOIN_GAME",
    payload: { playerIndex }
  }));

  broadcast("GAME_STATE_UPDATE", gameState);

  ws.on("message", (msg) => {
    const { type, payload } = JSON.parse(msg);
    const playerIndex = playerMap.get(ws);

    let success = false;

    if (type === "PLACE_NUMBER") {
      success = placeNumber(
        gameState,
        playerIndex,
        payload.r,
        payload.c,
        payload.number
      );
    }

    if (type === "CALL_NUMBER") {
      success = callNumber(
        gameState,
        playerIndex,
        payload.number
      );
    }

    if (!success) {
      ws.send(JSON.stringify({ type: "ERROR", payload: "Invalid move" }));
      return;
    }

    broadcast("GAME_STATE_UPDATE", gameState);

    if (gameState.phase === "gameover") {
      broadcast("GAME_OVER", gameState);
    }
  });

  ws.on("close", () => {
    clients = [];
    playerMap.clear();
    gameState = createInitialState();
  });
});

console.log(`Server running on ws://localhost:${PORT}`);
