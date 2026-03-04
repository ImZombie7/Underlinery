let socket = null;

export function getSocket() {
  return socket;
}

export function setSocket(ws) {
  socket = ws;
}

export function clearSocket() {
  socket = null;
}