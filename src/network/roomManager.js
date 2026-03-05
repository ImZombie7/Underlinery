import { createInitialState } from "../engine/state.js";

const rooms = new Map();

export function roomExists(roomId) {
  return rooms.has(roomId);
}

export function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      gameState: createInitialState(),
      clients: new Set(),
      playerMap: new Map(),
      userMap: new Map(),
      disconnectTimers: new Map(),
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      pendingBroadcast: false
    });
  }

  return rooms.get(roomId);
}

room.lastActivityAt=Date.now();

export function deleteRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  for (const timer of room.disconnectTimers.values()) {
    clearTimeout(timer);
  }

  rooms.delete(roomId);
  
}

export function removeClient(roomId, ws) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.clients.delete(ws);
  room.playerMap.delete(ws);

  if (room.clients.size === 0) {
    deleteRoom(roomId);
  }
}

setInterval(() => {
  const now = Date.now();

  for (const [roomId, room] of rooms.entries()) {
    if (room.clients.size === 0 && now - room.lastActivityAt > 10 * 60 * 1000) {
      for (const timer of room.disconnectTimers.values()) {
        clearTimeout(timer);
      }

      rooms.delete(roomId);
    }
  }
}, 60 * 1000);