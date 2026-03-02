import { createClient } from '@supabase/supabase-js';

// =============================
// SUPABASE CONFIG
// =============================

const SUPABASE_URL = "https://umdqileggszqlpjjfxvz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtZHFpbGVnZ3N6cWxwampmeHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTA4MjksImV4cCI6MjA4NzQyNjgyOX0.K_rRlUh5dnPpNzpSDEu3hB1__mLTkoDRy7o31z5GjcI"; // NOT service role

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

const gridEl = document.getElementById("grid");
const ticksEl = document.getElementById("ticks");
const calledEl = document.getElementById("called-numbers");
const statusEl = document.getElementById("status");
const numberInput = document.getElementById("numberInput");

// =============================
// AUTH FLOW
// =============================

async function initAuth() {
  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    showLogin();
    return;
  }

  currentJwt = data.session.access_token;
  connectSocket(currentJwt);

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      disconnectSocket();
      showLogin();
    }

    if (event === "TOKEN_REFRESHED" && session?.access_token) {
      currentJwt = session.access_token;
      reconnectWithNewToken(currentJwt);
    }
  });
}

function showLogin() {
  statusEl.textContent = "Login required.";

  const email = prompt("Email:");
  const password = prompt("Password:");

  if (!email || !password) return;

  supabase.auth.signInWithPassword({ email, password })
    .then(({ error }) => {
      if (error) {
        alert("Login failed.");
        return;
      }
      location.reload();
    });
}

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
  if (!gameState || !socket) return;

  const number = parseInt(numberInput.value);
  if (!Number.isInteger(number)) return;

  const version = gameState.version;

  if (gameState.phase === "placement") {
    if (!selectedCell) return;

    socket.send(JSON.stringify({
      type: "PLACE_NUMBER",
      payload: {
        r: selectedCell.r,
        c: selectedCell.c,
        number,
        version
      }
    }));
  }

  if (gameState.phase === "match") {
    socket.send(JSON.stringify({
      type: "CALL_NUMBER",
      payload: {
        number,
        version
      }
    }));
  }
};

document.getElementById("lockBtn").onclick = () => {
  if (!socket || !gameState) return;

  socket.send(JSON.stringify({
    type: "LOCK_GRID",
    payload: {
      version: gameState.version
    }
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

      if (value === "X") {
        cell.classList.add("marked");
      }

      if (gameState.phase === "placement" && value === null) {
        cell.onclick = () => {
          selectedCell = { r, c };
          render();
        };
      }

      if (
        selectedCell &&
        selectedCell.r === r &&
        selectedCell.c === c
      ) {
        cell.classList.add("selected");
      }

      gridEl.appendChild(cell);
    }
  }

  ticksEl.textContent = `Ticks: ${player.ticks}`;
  calledEl.textContent =
    "Called: " + (gameState.calledNumbers?.join(", ") || "");

  if (gameState.phase === "gameover") {
    statusEl.textContent =
      gameState.winner === playerIndex
        ? "You won."
        : "You lost.";
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