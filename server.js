import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import {
  createInitialState,
  placeNumber,
  callNumber
} from "./engine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Serve static files from the 'web' directory
app.use(express.static(path.join(__dirname, "web")));

let gameState = createInitialState();
let clients = [];
let playerMap = new Map();

function broadcast(type, payload) {
  const message = JSON.stringify({ type, payload });
  clients.forEach(ws => {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(message);
    }
  });
}

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on("connection", (ws) => {
  console.log("Client connected");

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

  ws.on('message', (message) => {
    try {
      const { type, payload } = JSON.parse(message);
      const playerIndex = playerMap.get(ws);

      if (type === "PLACE_NUMBER") {
        const { r, c, number } = payload;
        if (placeNumber(gameState, playerIndex, r, c, number)) {
          broadcast("GAME_STATE_UPDATE", gameState);
        }
      } else if (type === "CALL_NUMBER") {
        const { number } = payload;
        if (callNumber(gameState, playerIndex, number)) {
          broadcast("GAME_STATE_UPDATE", gameState);
        }
      }
    } catch (e) {
      console.error("Error processing message:", e);
    }
  });

  ws.on('close', () => {
    clients = clients.filter(client => client !== ws);
    playerMap.delete(ws);
    console.log("Client disconnected");
    // Reset game if a player leaves? For now just log.
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});
