import { login, register, getSessionUser } from "./auth.js";
import { renderBoard, clearAnimations } from "./ui.js";
import { startOffline, handleOfflineMove } from "./offline.js";
import { startAI, handleAIMove } from "./ai.js";
import { startMultiplayer } from "./multiplayer.js";

const socket = io();

/* ================= DOM ================= */
const authModal = document.getElementById("authModal");
const authUsername = document.getElementById("authUsername");
const authPassword = document.getElementById("authPassword");
const authError = document.getElementById("authError");

const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");

const gameUI = document.getElementById("gameUI");
const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const inviteBox = document.getElementById("inviteBox");
const xScoreEl = document.getElementById("xScore");
const oScoreEl = document.getElementById("oScore");
const modeSelect = document.getElementById("mode");

/* ================= GAME STATE ================= */
const game = {
  board: Array(9).fill(""),
  currentPlayer: "X",
  gameEnded: false,
  scores: { X: 0, O: 0 },
  highScore: 0,
  playerName: "",

  updateScore() {
    xScoreEl.textContent = this.scores.X;
    oScoreEl.textContent = this.scores.O;
  }
};

/* ================= AUTH ================= */
loginBtn.onclick = async () => {
  authError.textContent = "";
  const res = await login(authUsername.value, authPassword.value);
  if (res.error) return (authError.textContent = res.error);
  startGame(res);
};

registerBtn.onclick = async () => {
  authError.textContent = "";
  const res = await register(authUsername.value, authPassword.value);
  if (res.error) return (authError.textContent = res.error);
  startGame(res);
};

function startGame(user) {
  game.playerName = user.username;
  game.highScore = user.highScore;

  authModal.classList.add("hidden");
  gameUI.classList.remove("hidden");

  init();
}

/* ================= INIT ================= */
function init() {
  game.board = Array(9).fill("");
  game.currentPlayer = "X";
  game.gameEnded = false;

  clearAnimations(boardEl);

  // ✅ ALWAYS render the board first
  renderBoard(game.board, boardEl, i => handleMove(i));

  if (modeSelect.value === "offline") {
    startOffline(game);
  } else if (modeSelect.value === "ai") {
    startAI(game);
  } else {
    startMultiplayer(game, socket);
  }
}

modeSelect.onchange = init;

/* ================= MOVE HANDLER ================= */
function handleMove(index) {
  if (modeSelect.value === "offline") {
    handleOfflineMove(index, game);
  } else if (modeSelect.value === "ai") {
    handleAIMove(index, game);
  } else {
    socket.emit("move", index);
  }
}

/* ================= BUTTONS ================= */
document.getElementById("restartBtn").onclick = init;

document.getElementById("clearScoreBtn").onclick = () => {
  game.scores = { X: 0, O: 0 };
  game.updateScore();
};

document.getElementById("highScoreBtn").onclick = () => {
  alert(`Your High Score: ${game.highScore}`);
};

/* ================= AUTO LOGIN ================= */
(async () => {
  const user = await getSessionUser();
  if (user) startGame(user);
})();
