import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// =============================
// SUPABASE CONFIG
// =============================

const SUPABASE_URL = "https://umdqileggszqlpjjfxvz.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_PUBLIC_ANON_KEY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =============================
// STATE
// =============================

let socket = null;
let reconnectAttempts = 0;
let gameState = null;
let playerIndex = null;
let selectedCell = null;
let currentJwt = null;

// =============================
// DOM
// =============================

const authPanel = document.getElementById("auth");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");

const gridEl = document.getElementById("grid");
const ticksEl = document.getElementById("ticks");
const calledEl = document.getElementById("called-numbers");
const statusEl = document.getElementById("status");
const numberInput = document.getElementById("numberInput");

// =============================
// AUTH
// =============================

async function initAuth() {
  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    showAuth();
    return;
  }

  onAuthenticated(data.session);
}

function showAuth() {
  authPanel.style.display = "block";
  statusEl.textContent = "Login or register to continue.";
}

function hideAuth() {
  authPanel.style.display = "none";
}

function onAuthenticated(session) {
  currentJwt = session.access_token;
  hideAuth();
  connectSocket(currentJwt);
}

loginBtn.onclick = async () => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailInput.value.trim(),
    password: passwordInput.value.trim()
  });

  if (error) {
    alert(error.message);
    return;
  }

  onAuthenticated(data.session);
};

registerBtn.onclick = async () => {
  const { error } = await supabase.auth.signUp({
    email: emailInput.value.trim(),
    password: passwordInput.value.trim()
  });

  if (error) {
    alert(error.message);
    return;
  }

  alert("Check your email to confirm registration.");
};

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") {
    disconnectSocket();
    showAuth();
  }

  if (event === "TOKEN_REFRESHED" && session?.access_token) {
    currentJwt = session.access_token;
    reconnectWithNewToken(currentJwt);
  }
});

// =============================
// WEBSOCKET
// =============================

function connectSocket(jwt) {
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const host = location.host;

  socket = new WebSocket(
    `${protocol}://${host}/ws?room=ranked&token=${encodeURIComponent(jwt)}`
  );

  socket.onopen = () => {
    reconnectAttempts = 0;
    statusEl.textContent = "Connected.";
  };

  socket.onmessage = (event) => {
    const { type, payload } = JSON.parse(event.data);

    if (type === "GAME_STATE_UPDATE") {
      gameState = payload;
      playerIndex = payload.playerIndex;
      render();
    }
  };

  socket.onclose = () => {
    statusEl.textContent = "Disconnected. Reconnecting...";
    attemptReconnect();
  };
}

function disconnectSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }
}

function attemptReconnect() {
  if (reconnectAttempts > 5) {
    statusEl.textContent = "Connection lost.";
    return;
  }

  reconnectAttempts++;
  setTimeout(() => {
    connectSocket(currentJwt);
  }, 2000 * reconnectAttempts);
}

function reconnectWithNewToken(newJwt) {
  disconnectSocket();
  connectSocket(newJwt);
}

// =============================
// GAME ACTIONS
// =============================

document.getElementById("actionBtn").onclick = () => {
  if (!socket || !gameState) return;

  const number = parseInt(numberInput.value);
  if (!Number.isInteger(number)) return;

  const version = gameState.version;

  if (gameState.phase === "placement" && selectedCell) {
    socket.send(JSON.stringify({
      type: "PLACE_NUMBER",
      payload: { ...selectedCell, number, version }
    }));
  }

  if (gameState.phase === "match") {
    socket.send(JSON.stringify({
      type: "CALL_NUMBER",
      payload: { number, version }
    }));
  }
};

document.getElementById("lockBtn").onclick = () => {
  if (!socket || !gameState) return;

  socket.send(JSON.stringify({
    type: "LOCK_GRID",
    payload: { version: gameState.version }
  }));
};

// =============================
// RENDER
// =============================

function render() {
  if (!gameState) return;

  const player = gameState.me;
  gridEl.innerHTML = "";

  for (let r = 0; r < 11; r++) {
    for (let c = 0; c < 11; c++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");

      const value = player.grid[r][c];
      cell.textContent = value ?? "";

      if (value === "X") cell.classList.add("marked");

      if (gameState.phase === "placement" && value === null) {
        cell.onclick = () => {
          selectedCell = { r, c };
          render();
        };
      }

      if (selectedCell?.r === r && selectedCell?.c === c)
        cell.classList.add("selected");

      gridEl.appendChild(cell);
    }
  }

  ticksEl.textContent = `Ticks: ${player.ticks}`;
  calledEl.textContent =
    "Called: " + (gameState.calledNumbers?.join(", ") || "");

  if (gameState.phase === "gameover") {
    statusEl.textContent =
      gameState.winner === playerIndex ? "You won." : "You lost.";
  } else {
    statusEl.textContent =
      gameState.currentPlayer === playerIndex
        ? "Your turn."
        : "Opponent's turn.";
  }
}

// =============================
// INIT
// =============================

initAuth();