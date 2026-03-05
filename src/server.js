import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";
import { jwtVerify, createRemoteJWKSet } from "jose";

import { getRoom, removeClient } from "./network/roomManager.js";
import { validateMessage } from "./network/validate.js";
import {
  placeNumber,
  lockGrid,
  performToss,
  callNumber
} from "./engine/rules.js";

dotenv.config();

const {
  PORT = 5000,
  SUPABASE_URL,
  SUPABASE_JWT_ISSUER
} = process.env;

if (!SUPABASE_URL) throw new Error("SUPABASE_URL missing");
if (!SUPABASE_JWT_ISSUER) throw new Error("SUPABASE_JWT_ISSUER missing");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

app.use(express.static("dist"));

server.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});

/* ================= JWT ================= */

const JWKS = createRemoteJWKSet(
  new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

async function verifyToken(token) {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: SUPABASE_JWT_ISSUER,
    audience: "authenticated",
    algorithms: ["ES256"]
  });
  return payload;
}

/* ================= UPGRADE ================= */

server.on("upgrade", async (req, socket, head) => {

  if (!req.url.startsWith("/ws")) {
    socket.destroy();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  const token = url.searchParams.get("token");
  const roomId = url.searchParams.get("room") || "ranked";
  const name = url.searchParams.get("name") || "player";

  if (!token) {
    socket.destroy();
    return;
  }

  try {

    const user = await verifyToken(token);

    req.user = user;
    req.roomId = roomId;
    req.name = name;

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });

  } catch {
    socket.destroy();
  }

});

/* ================= CONNECTION ================= */

/* ================= CONNECTION ================= */

wss.on("connection", (ws, req) => {
  const room = getRoom(req.roomId);
  const userId = req.user.sub;

  // 🔥 Update activity when someone connects
  room.lastActivityAt = Date.now();

  let playerIndex;
  
  ws.on("message", (raw) => {
    if (room.userMap.size < 2) return;

    // 🔥 Update activity whenever a message is received
    room.lastActivityAt = Date.now();

    const validated = validateMessage(raw.toString());
    if (!validated) return;
  });

  ws.on("close", () => {
    removeClient(req.roomId, ws);

    // 🔥 Update activity when someone disconnects
    room.lastActivityAt = Date.now();
  });
});

/* ================= BROADCAST ================= */

function broadcast(room){

  for(const client of room.clients){

    if(client.readyState !== 1) continue

    const playerIndex = room.playerMap.get(client)

    client.send(JSON.stringify({
      type:"GAME_STATE_UPDATE",
      payload:serializeState(
        room.gameState,
        playerIndex,
        room.userMap.size
      )
    }))

  }

}

/* ================= SEND STATE ================= */

function sendState(ws, room, playerIndex) {
  ws.send(JSON.stringify({
    type:"GAME_STATE_UPDATE",
    payload:serializeState(
      room.gameState,
      playerIndex,
      room.userMap.size
    )
  }))

}

/* ================= SERIALIZE ================= */

function serializeState(state, playerIndex, playerCount){

  return {
    version: state.version,
    phase: state.phase,
    currentPlayer: state.currentPlayer,
    winner: state.winner,
    playerIndex,
    playerCount,

    me:{
      ...state.players[playerIndex],
      usedNumbers:Array.from(state.players[playerIndex].usedNumbers)
    },

    calledNumbers:Array.from(state.calledNumbers)
  }

}