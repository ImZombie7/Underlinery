import { createInitialState } from "../engine/state.js";

const rooms = new Map();

export function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      gameState: createInitialState(),
      clients: new Set(),
      playerMap: new Map(),
      userMap: new Map(),
      disconnectTimers: new Map(),
      turnDeadline: null
    });
  }
  return rooms.get(roomId);
}

export function removeClient(roomId, ws) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.clients.delete(ws);
  room.playerMap.delete(ws);

  if (room.clients.size === 0) {
    rooms.delete(roomId);
  }
}