import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import pino from "pino";

import { getRoom, removeClient } from "./network/roomManager.js";
import { validateMessage } from "./network/validate.js";
import { placeNumber, callNumber, lockGrid, performToss } from "./engine/rules.js";
import { TURN_TIME_MS, RECONNECT_GRACE_MS } from "./engine/state.js";

const logger = pino();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 5000;

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

app.use(express.static(path.join(__dirname, "../web")));

function verifyJWT(token) {
  try {
    return jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
  } catch {
    return null;
  }
}

server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, ws => {
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomId = url.searchParams.get("room") || "ranked";
  const token = url.searchParams.get("token");

  if (!token) return ws.close();

  const decoded = verifyJWT(token);
  if (!decoded) return ws.close();

  const userId = decoded.sub;
  const room = getRoom(roomId);

  let playerIndex;

  if (room.userMap.has(userId)) {
    playerIndex = room.userMap.get(userId);
  } else {
    if (room.userMap.size >= 2) return ws.close();
    playerIndex = room.userMap.size;
    room.userMap.set(userId, playerIndex);
  }

  room.clients.add(ws);
  room.playerMap.set(ws, playerIndex);

  sendState(ws, room);

  ws.on("message", raw => {
    const msg = validateMessage(raw.toString());
    if (!msg) return;

    const index = room.playerMap.get(ws);
    let success = false;

    if (msg.type === "PLACE_NUMBER") {
      success = placeNumber(room.gameState, index,
        msg.payload.r, msg.payload.c, msg.payload.number);
    }

    if (msg.type === "LOCK_GRID") {
      success = lockGrid(room.gameState, index);
      if (success && room.gameState.phase === "toss") {
        performToss(room.gameState);
      }
    }

    if (msg.type === "CALL_NUMBER") {
      success = callNumber(room.gameState, index, msg.payload.number);
    }

    if (success) broadcastState(room);
  });

  ws.on("close", () => {
    const index = room.playerMap.get(ws);

    room.disconnectTimers.set(index,
      setTimeout(() => {
        if (room.gameState.phase !== "gameover") {
          room.gameState.phase = "gameover";
          room.gameState.winner = 1 - index;
          broadcastState(room);
        }
      }, RECONNECT_GRACE_MS)
    );

    removeClient(roomId, ws);
  });
});

server.listen(PORT, () => {
  logger.info(`Server running on ${PORT}`);
});

function sendState(ws, room) {
  const index = room.playerMap.get(ws);

  ws.send(JSON.stringify({
    type: "GAME_STATE_UPDATE",
    payload: {
      phase: room.gameState.phase,
      currentPlayer: room.gameState.currentPlayer,
      calledNumbers: [...room.gameState.calledNumbers],
      me: room.gameState.players[index],
      winner: room.gameState.winner,
      version: room.gameState.version
    }
  }));
}

function broadcastState(room) {
  room.clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN)
      sendState(ws, room);
  });
}