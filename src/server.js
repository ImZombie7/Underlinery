import express from "express";
import http from "http";
<<<<<<< Updated upstream
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import pino from "pino";
import { jwtVerify, createRemoteJWKSet } from "jose";

import { getRoom, removeClient, roomExists } from "./network/roomManager.js";
import { validateMessage } from "./network/validate.js";
import {
  placeNumber,
  callNumber,
  lockGrid,
  performToss
} from "./engine/rules.js";
import { RECONNECT_GRACE_MS } from "./engine/state.js";

/* ================================
   Basic Setup
================================ */

const baseLogger = pino();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 5000;

=======
import { WebSocketServer } from "ws";
import dotenv from "dotenv";
import { jwtVerify, createRemoteJWKSet } from "jose";

dotenv.config();

/* =========================
   ENV VALIDATION
========================= */
const {
  PORT = 5000,
  SUPABASE_URL,
  SUPABASE_JWT_ISSUER
} = process.env;

if (!SUPABASE_URL) throw new Error("SUPABASE_URL missing");
if (!SUPABASE_JWT_ISSUER) throw new Error("SUPABASE_JWT_ISSUER missing");

/* =========================
   SERVER SETUP
========================= */
>>>>>>> Stashed changes
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

<<<<<<< Updated upstream
let activeConnections = 0;
let totalMessages = 0;

/* ================================
   Supabase JWT Verification
================================ */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_JWT_ISSUER = process.env.SUPABASE_JWT_ISSUER;

if (!SUPABASE_URL) throw new Error("SUPABASE_URL missing.");
if (!SUPABASE_JWT_ISSUER) throw new Error("SUPABASE_JWT_ISSUER missing.");

const JWKS = createRemoteJWKSet(
  new URL("/auth/v1/keys", SUPABASE_URL)
);

=======
app.use(express.static("dist"));

server.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});

/* =========================
   JWKS (AUTO CACHED)
========================= */
const JWKS = createRemoteJWKSet(
  new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

/* =========================
   VERIFY TOKEN
========================= */
>>>>>>> Stashed changes
async function verifyToken(token) {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: SUPABASE_JWT_ISSUER,
    audience: "authenticated",
<<<<<<< Updated upstream
    algorithms: ["RS256"]
  });
  return payload;
}

/* ================================
   Static Frontend (Vite dist)
================================ */

app.use(express.static(path.join(__dirname, "../dist")));

/* ================================
   Heartbeat
================================ */

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

/* ================================
   Graceful Shutdown
================================ */

const shutdown = () => {
  baseLogger.info("Shutting down gracefully...");

  clearInterval(heartbeatInterval);

  wss.clients.forEach(ws =>
    ws.close(1001, "Server shutting down")
  );

  server.close(() => process.exit(0));
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

/* ================================
   WebSocket Upgrade
================================ */

server.on("upgrade", async (req, socket, head) => {
  if (!req.url.startsWith("/ws")) {
    socket.destroy();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get("token");

  if (!token) {
    socket.destroy();
    return;
  }

  let payload;
  try {
    payload = await verifyToken(token);
  } catch {
    socket.destroy();
    return;
  }

  req.user = payload;

  wss.handleUpgrade(req, socket, head, ws => {
    wss.emit("connection", ws, req);
  });
});

/* ================================
   WebSocket Connection
================================ */

wss.on("connection", (ws, req) => {
  activeConnections++;
  baseLogger.info({ activeConnections }, "Client connected");

  ws.isAlive = true;
  ws.on("pong", heartbeat);

  ws.lastMessageTime = 0;
  ws.messageCount = 0;

  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomId = url.searchParams.get("room") || "ranked";
  const userId = req.user.sub;

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
=======
    algorithms: ["ES256"]
  });

  return payload;
}

/* =========================
   WEBSOCKET UPGRADE
========================= */
server.on("upgrade", async (req, socket, head) => {
  if (!req.url.startsWith("/ws")) {
    socket.destroy();
    return;
  }

  console.log("⚡ Upgrade request:", req.url);

  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get("token");

  if (!token) {
    console.log("❌ Missing token");
    socket.destroy();
    return;
>>>>>>> Stashed changes
  }

  try {
    const user = await verifyToken(token);
    req.user = user;

    console.log("✅ Authenticated:", user.sub);

<<<<<<< Updated upstream
  /* ================================
     Message Handling
  ================================= */

  ws.on("message", raw => {
    room.lastActivityAt = Date.now();
    totalMessages++;

    const now = Date.now();

    // Basic rate limiting
    if (now - ws.lastMessageTime < 50) {
      ws.messageCount++;
      if (ws.messageCount > 10)
        return ws.close(1008, "Rate limit exceeded");
    } else {
      ws.messageCount = 0;
    }

    ws.lastMessageTime = now;

    const msg = validateMessage(raw.toString());
    if (!msg) return;

    if (
      typeof msg.payload?.version !== "number" ||
      msg.payload.version !== room.gameState.version
    ) {
      sendState(ws, room);
      return;
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
      success = callNumber(
        room.gameState,
        index,
        msg.payload.number
      );
    }

    if (success) broadcastState(room);
  });

  /* ================================
     Disconnect Handling
  ================================= */

  ws.on("close", () => {
    activeConnections--;
    baseLogger.info({ activeConnections }, "Client disconnected");

    const index = room.playerMap.get(ws);
    if (typeof index !== "number") return;

    if (room.disconnectTimers.has(index))
      clearTimeout(room.disconnectTimers.get(index));

    room.disconnectTimers.set(
      index,
      setTimeout(() => {
        if (!roomExists(roomId)) return;

        const room = getRoom(roomId);

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

/* ================================
   State Broadcasting
================================ */

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
=======
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });

  } catch (err) {
    console.error("❌ Token verification failed:", err.message);
    socket.destroy();
  }
});

/* =========================
   CONNECTION HANDLER
========================= */
wss.on("connection", (ws, req) => {
  console.log("🟢 Connected:", req.user.sub);

  ws.send(JSON.stringify({
    type: "CONNECTED",
    userId: req.user.sub
>>>>>>> Stashed changes
  }));

<<<<<<< Updated upstream
function broadcastState(room) {
  room.clients.forEach(ws => {
    if (ws.readyState === 1) {
      try {
        sendState(ws, room);
      } catch (err) {
        baseLogger.error(err);
      }
    }
  });
}

/* ================================
   Start Server
================================ */

server.listen(PORT, () => {
  baseLogger.info(`Server running on ${PORT}`);
=======
  ws.on("message", (msg) => {
    console.log("📨 Message:", msg.toString());
  });

  ws.on("close", (code) => {
    console.log("🔴 Disconnected:", code);
  });

  ws.on("error", (err) => {
    console.log("🔥 WS error:", err.message);
  });
>>>>>>> Stashed changes
});