import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

/* =============================
   SUPABASE CONFIG
============================= */

const SUPABASE_URL = "https://umdqileggszqlpjjfxvz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtZHFpbGVnZ3N6cWxwampmeHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTA4MjksImV4cCI6MjA4NzQyNjgyOX0.K_rRlUh5dnPpNzpSDEu3hB1__mLTkoDRy7o31z5GjcI"; // keep yours

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* =============================
   GLOBAL STATE
============================= */

let socket = null;
let reconnectAttempts = 0;
let gameState = null;
let playerIndex = null;
let selectedCell = null;
let currentJwt = null;

/* =============================
   DOM REFERENCES
============================= */

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
const actionBtn = document.getElementById("actionBtn");
const lockBtn = document.getElementById("lockBtn");

/* =============================
   AUTH
============================= */

async function initAuth() {
  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    showAuth();
    renderEmptyGrid();
    return;
  }

  onAuthenticated(data.session);
}

function showAuth() {
  authPanel.style.display = "block";
  statusEl.textContent = "Login to continue.";
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

  if (error) return alert(error.message);
  onAuthenticated(data.session);
};

registerBtn.onclick = async () => {
  const { error } = await supabase.auth.signUp({
    email: emailInput.value.trim(),
    password: passwordInput.value.trim()
  });

  if (error) return alert(error.message);
  alert("Check email to confirm.");
};

/* =============================
   WEBSOCKET
============================= */

function connectSocket(jwt) {
  const protocol = location.protocol === "https:" ? "wss" : "ws";

  socket = new WebSocket(
    `${protocol}://${location.host}/ws?room=ranked&token=${encodeURIComponent(jwt)}`
  );

  socket.onopen = () => {
    reconnectAttempts = 0;
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
    attemptReconnect();
  };
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

/* =============================
   ACTION BUTTONS
============================= */

actionBtn.onclick = () => {
  if (!socket || !gameState) return;
  if (gameState.playerCount < 2) return;

  const number = Number(numberInput.value);
  if (!Number.isInteger(number)) return;

  if (gameState.phase === "placement") {
    if (!selectedCell) return;

    socket.send(JSON.stringify({
      type: "PLACE_NUMBER",
      payload: {
        r: selectedCell.r,
        c: selectedCell.c,
        number,
        version: gameState.version
      }
    }));

    selectedCell = null;
  }

  if (gameState.phase === "match") {
    if (gameState.currentPlayer !== playerIndex) return;

    socket.send(JSON.stringify({
      type: "CALL_NUMBER",
      payload: {
        number,
        version: gameState.version
      }
    }));
  }
};

lockBtn.onclick = () => {
  if (!socket || !gameState) return;
  if (gameState.playerCount < 2) return;

  socket.send(JSON.stringify({
    type: "LOCK_GRID",
    payload: {
      version: gameState.version
    }
  }));
};

/* =============================
   RENDERING
============================= */

function renderEmptyGrid() {
  gridEl.innerHTML = "";
  for (let i = 0; i < 121; i++) {
    const cell = document.createElement("div");
    cell.classList.add("cell");
    gridEl.appendChild(cell);
  }
}

function render() {
  gridEl.innerHTML = "";

  if (!gameState) {
    renderEmptyGrid();
    return;
  }

  const player = gameState.me;

  for (let r = 0; r < 11; r++) {
    for (let c = 0; c < 11; c++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");

      const value = player.grid[r][c];
      cell.textContent = value ?? "";

      if (value === "X") cell.classList.add("marked");

      if (selectedCell?.r === r && selectedCell?.c === c)
        cell.classList.add("selected");

      if (
        gameState.phase === "placement" &&
        value === null &&
        !player.locked
      ) {
        cell.onclick = () => {
          selectedCell = { r, c };
          render();
        };
      }

      gridEl.appendChild(cell);
    }
  }

  ticksEl.textContent = `Ticks: ${player.ticks}`;
  calledEl.textContent =
    "Called: " + (gameState.calledNumbers?.join(", ") || "");

  /* =============================
     STATUS LOGIC (CLEAN UX)
  ============================= */

  if (gameState.playerCount < 2) {
    statusEl.textContent = "Waiting for opponent...";
    return;
  }

  if (gameState.phase === "placement") {
    statusEl.textContent = player.locked
      ? "Waiting for opponent to lock..."
      : "Place your numbers.";
    return;
  }

  if (gameState.phase === "gameover") {
    statusEl.textContent =
      gameState.winner === playerIndex ? "You won." : "You lost.";
    return;
  }

  statusEl.textContent =
    gameState.currentPlayer === playerIndex
      ? "Your turn."
      : "Opponent's turn.";
}

/* =============================
   INIT
============================= */

renderEmptyGrid();
initAuth();