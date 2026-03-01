import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import pino from "pino";
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { getRoom, removeClient, roomExists } from "./network/roomManager.js";

let activeConnections = 0;
let totalMessages = 0;

// ================================
// SUPABASE CONFIG (Server-Side)
// ================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_JWT_ISSUER = process.env.SUPABASE_JWT_ISSUER;

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL is missing in environment.");
}

if (!SUPABASE_JWT_ISSUER) {
  throw new Error("SUPABASE_JWT_ISSUER is missing in environment.");
}

const JWKS = createRemoteJWKSet(
  new URL(`${SUPABASE_URL}/auth/v1/keys`)
);

async function verifyToken(token) {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: SUPABASE_JWT_ISSUER,
    audience: "authenticated",
    algorithms: ["RS256"]
  });

  return payload;
}

import { validateMessage } from "./network/validate.js";
import { placeNumber, callNumber, lockGrid, performToss } from "./engine/rules.js";
import { RECONNECT_GRACE_MS } from "./engine/state.js";

const baseLogger = pino();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 5000;

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

function heartbeat() {
  this.isAlive = true;
}

const heartbeatInterval = setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

process.on("SIGTERM", () => {
  baseLogger.info("Shutting down gracefully...");
  wss.clients.forEach(ws => ws.close(1001, "Server shutting down"));
  server.close(() => process.exit(0));
});

app.use(express.static(path.join(__dirname, "../web")));

function scheduleBroadcast(room) {
  if (room.pendingBroadcast) return;

  room.pendingBroadcast = true;

  setImmediate(() => {
    room.pendingBroadcast = false;
    broadcastState(room);
  });
}

server.on("upgrade", async (req, socket, head) => {
  if (!req.url.startsWith("/ws")) {
    baseLogger.warn("Unauthorized upgrade attempt");
    socket.destroy();
    return;
  }

  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    baseLogger.warn("Unauthorized upgrade attempt");
    socket.destroy(); // 401 equivalent
    return;
  }

  const token = authHeader.split(" ")[1];

  let payload;
  try {
    payload = await Promise.race([
      verifyToken(token),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Auth timeout")), 5000)
      )
    ]);
  } catch {
    baseLogger.warn("Unauthorized upgrade attempt");
    socket.destroy();
    return;
  }

  // attach auth to request for later use
  req.user = payload;

  wss.handleUpgrade(req, socket, head, ws => {
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", (ws, req) => {

  activeConnections++;
  baseLogger.info({ activeConnections }, "Client connected");

  ws.isAlive = true;
  ws.on("pong", heartbeat);

  ws.lastMessageTime = 0;
  ws.messageCount = 0;

  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get("token");

  ws.close(1008, "Missing token");
  return;

  const roomId = url.searchParams.get("room") || "ranked";

  const userId = req.user.sub; // 🔥 already verified in upgrade

  const roomLogger = baseLogger.child({ roomId });
  roomLogger.info({ userId }, "Client connected");

  const room = getRoom(roomId);
  room.lastActivityAt = Date.now();
  let playerIndex;

  if (room.userMap.has(userId)) {
    playerIndex = room.userMap.get(userId);

    if (room.disconnectTimers.has(playerIndex)) {
      clearTimeout(room.disconnectTimers.get(playerIndex));
      room.disconnectTimers.delete(playerIndex);
    }

  } else {
    if (room.userMap.size >= 2)
      return ws.close(1008, "Room full");

    playerIndex = room.userMap.size;
    room.userMap.set(userId, playerIndex);
  }

  room.clients.add(ws);
  room.playerMap.set(ws, playerIndex);

  sendState(ws, room);

  ws.on("message", raw => {

    room.lastActivityAt = Date.now();

    totalMessages++;

    if (totalMessages % 100 === 0) {
      baseLogger.info({ totalMessages }, "Message milestone reached");
    }

    const now = Date.now();

    if (now - ws.lastMessageTime < 50) {
      ws.messageCount++;

      if (ws.messageCount > 10) {
        baseLogger.warn({
          userId,
          roomId,
          ip: req.socket.remoteAddress
        }, "Rate limit exceeded");

        ws.close(1008, "Rate limit exceeded");
        return;
      }

    } else {
      ws.messageCount = 0;
    }  

    ws.lastMessageTime = now;

    const msg = validateMessage(raw.toString());
    if (!msg) return;

    // ✅ Version protection AFTER msg exists
    if (
      typeof msg.payload?.version !== "number" ||
      msg.payload.version !== room.gameState.version
     ) {
      sendState(ws, room); // force resync
      return; // stale action rejected
    }

    const index = room.playerMap.get(ws);
    if (typeof index !== "number") return;
    let success = false;

    if (msg.type === "PLACE_NUMBER") {
      success = placeNumber(
        room.gameState,
        index,
        msg.payload.r,
        msg.payload.c,
        msg.payload.number
      );
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

    if (success) {
      scheduleBroadcast(room);
    }
    
  });

  ws.on("close", () => {

    activeConnections--;
    baseLogger.info({ activeConnections }, "Client disconnected");

    const index = room.playerMap.get(ws);
    if (typeof index !== "number") return;
    


    if (room.disconnectTimers.has(index)) {
      clearTimeout(room.disconnectTimers.get(index));
    }

    room.disconnectTimers.set(
      index,
      setTimeout(() => {
        if (!roomExists(roomId)) return;

        const room = getRoom(roomId);
        if (!roomExists(roomId)) return;

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
  baseLogger.info(`Server running on ${PORT}`);
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
      version: room.gameState.version,
      playerIndex: index
    }
  }));
}

function broadcastState(room) {
  room.clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN)     
      try {
        sendState(ws, room);
      } catch (err) {
        baseLogger.error(err);
      }
  });
}