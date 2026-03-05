import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const supabase = createClient(
"https://umdqileggszqlpjjfxvz.supabase.co",
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtZHFpbGVnZ3N6cWxwampmeHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTA4MjksImV4cCI6MjA4NzQyNjgyOX0.K_rRlUh5dnPpNzpSDEu3hB1__mLTkoDRy7o31z5GjcI"
)

let socket
let gameState
let playerIndex
let placementCounter = 1
let displayName = ""

const gridEl = document.getElementById("grid")
const statusEl = document.getElementById("status")
const ticksEl = document.getElementById("ticks")
const calledEl = document.getElementById("called")

const emailInput = document.getElementById("email")
const passInput = document.getElementById("password")

document.getElementById("loginBtn").onclick = login
document.getElementById("registerBtn").onclick = register

/* ================= AUTH ================= */

async function register(){

  const email = emailInput.value
  const password = passInput.value

  const { data, error } = await supabase.auth.signUp({
    email,
    password
  })

  if(error){
    statusEl.textContent = error.message
    return
  }

  await createProfileIfMissing(data.user)

  statusEl.textContent = "Registered. Login now."

}

async function login(){

  const email = emailInput.value
  const password = passInput.value

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if(error){
    statusEl.textContent = error.message
    return
  }

  await loadProfile(data.user.id)

  connectSocket(data.session.access_token)

}

/* ================= PROFILE ================= */

async function createProfileIfMissing(user){

  const name = user.email.split("@")[0]

  await supabase
  .from("profiles")
  .upsert({
    id:user.id,
    display_name:name
  })

}

async function loadProfile(userId){

  const { data } = await supabase
  .from("profiles")
  .select("display_name")
  .eq("id",userId)
  .single()

  displayName = data.display_name

}

/* ================= SOCKET ================= */

function connectSocket(jwt){

  const protocol =
    location.protocol === "https:" ? "wss" : "ws"

  socket = new WebSocket(
`${protocol}://${location.host}/ws?room=ranked&token=${jwt}&name=${displayName}`
  )

  socket.onmessage = (event)=>{

    const msg = JSON.parse(event.data)

    if(msg.type === "GAME_STATE_UPDATE"){
      gameState = msg.payload
      playerIndex = msg.payload.playerIndex
      render()
    }

  }

}

/* ================= RENDER ================= */

function render(){

  gridEl.innerHTML = ""

  if(!gameState) return

  const player = gameState.me

  for(let r=0;r<11;r++){

    for(let c=0;c<11;c++){

      const cell = document.createElement("div")
      cell.className = "cell"

      const value = player.grid[r][c]

      cell.textContent = value ?? ""

      if(value === "X")
        cell.classList.add("marked")

      cell.onclick = ()=>handleCellClick(r,c,value)

      gridEl.appendChild(cell)

    }

  }

  ticksEl.textContent =
    "Ticks: " + player.ticks

  calledEl.textContent =
    "Called: " + gameState.calledNumbers.join(",")

  updateStatus()

}

/* ================= INPUT ================= */

function handleCellClick(r,c,value){

  if(!socket || !gameState) return

  if(gameState.phase === "placement"){

    if(value !== null) return
    if(gameState.me.locked) return

    socket.send(JSON.stringify({
      type:"PLACE_NUMBER",
      payload:{
        r,
        c,
        number:placementCounter,
        version:gameState.version
      }
    }))

    placementCounter++

    if(placementCounter > 121){

      socket.send(JSON.stringify({
        type:"LOCK_GRID",
        payload:{version:gameState.version}
      }))

    }

  }

  if(gameState.phase === "match"){

    if(gameState.currentPlayer !== playerIndex) return
    if(typeof value !== "number") return

    socket.send(JSON.stringify({
      type:"CALL_NUMBER",
      payload:{
        number:value,
        version:gameState.version
      }
    }))

  }

}

/* ================= STATUS ================= */

function updateStatus(){

  if(gameState.playerCount < 2){
    statusEl.textContent = "Waiting for opponent"
    return
  }

  if(gameState.phase === "placement"){

    statusEl.textContent =
      gameState.me.locked
      ? "Waiting opponent"
      : "Place numbers"

    return
  }

  if(gameState.phase === "gameover"){

    statusEl.textContent =
      gameState.winner === playerIndex
      ? "You win"
      : "You lose"

    return
  }

  statusEl.textContent =
    gameState.currentPlayer === playerIndex
    ? "Your turn"
    : "Opponent turn"

}