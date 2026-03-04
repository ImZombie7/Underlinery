<<<<<<< Updated upstream
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
=======
import { getSocket, setSocket, clearSocket } from "./socket.js";
import { createClient } from "@supabase/supabase-js";
>>>>>>> Stashed changes

/* =========================
   ENV VALIDATION
========================= */
const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY
} = process.env;

<<<<<<< Updated upstream
const SUPABASE_URL = "https://umdqileggszqlpjjfxvz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtZHFpbGVnZ3N6cWxwampmeHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTA4MjksImV4cCI6MjA4NzQyNjgyOX0.K_rRlUh5dnPpNzpSDEu3hB1__mLTkoDRy7o31z5GjcI";
=======
if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SUPABASE_ANON_KEY) throw new Error("Missing SUPABASE_ANON_KEY");
>>>>>>> Stashed changes

/* =========================
   SUPABASE CLIENT
========================= */
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/* =========================
   SOCKET STATE
========================= */
let socket = null;
<<<<<<< Updated upstream
let reconnectAttempts = 0;
let gameState = null;
let playerIndex = null;
let selectedCell = null;
let currentJwt = null;
=======
let retryDelay = 1000;
let isConnecting = false;
>>>>>>> Stashed changes

/* =========================
   CONNECT FUNCTION
========================= */
async function connect() {
  const existing = getSocket();

<<<<<<< Updated upstream
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
=======
  if (existing && existing.readyState === WebSocket.OPEN) {
    console.log("🟢 Already connected.");
    return;
  }

  if (isConnecting) {
    console.log("⏳ Connection already in progress.");
    return;
  }

  isConnecting = true;

  try {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session) {
      console.log("❌ No session found");
      isConnecting = false;
      return;
>>>>>>> Stashed changes
    }

<<<<<<< Updated upstream
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
=======
    const token = session.access_token;

    const ws = new WebSocket(
      `ws://${location.host}/ws?room=ranked&token=${token}`
    );

    setSocket(ws);

    ws.onopen = () => {
      console.log("🟢 Connected to server");
      retryDelay = 1000;
      isConnecting = false;
    };

    ws.onmessage = (event) => {
      console.log("📩 Server:", event.data);
    };

    ws.onerror = (err) => {
      console.log("🔥 Socket error:", err);
    };

    ws.onclose = (event) => {
      console.log("🔴 Disconnected:", event.code);
      clearSocket();
      isConnecting = false;

      // Reconnect ONLY for unexpected closes
      if (event.code !== 1000 && event.code !== 1001) {
        console.log("♻️ Unexpected close. Reconnecting in", retryDelay, "ms");
        setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 10000);
      }
    };

  } catch (err) {
    console.error("❌ Connect failed:", err);
    isConnecting = false;

    console.log("♻️ Retry after failure in", retryDelay, "ms");
    setTimeout(connect, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 10000);
>>>>>>> Stashed changes
  }
}

/* =========================
   START (ONLY ONCE)
========================= */
connect();