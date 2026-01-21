import { login, register, getSessionUser } from "./auth.js";
import { renderBoard, clearAnimations } from "./ui.js";
import { startOffline, handleOfflineMove } from "./offline.js";
import { startAI, handleAIMove } from "./ai.js";
import { startMultiplayer } from "./multiplayer.js";

const socket = io();

/* ================= GAME STATE ================= */
const game = {
  board: Array(9).fill(""),
  currentPlayer: "X",
  gameEnded: false,
  scores: { X: 0, O: 0 },
  highScore: 0,
  playerName: "",

  boardEl: document.getElementById("board"),
  statusEl: document.getElementById("status"),
  inviteBox: document.getElementById("inviteBox"),
  xScoreEl: document.getElementById("xScore"),
  oScoreEl: document.getElementById("oScore"),

  updateScore() {
    this.xScoreEl.textContent = this.scores.X;
    this.oScoreEl.textContent = this.scores.O;
  }
};

/* ================= AUTH ================= */
const authModal = document.getElementById("authModal");
const authUsername = document.getElementById("authUsername");
const authPassword = document.getElementById("authPassword");
const authError = document.getElementById("authError");

document.getElementById("loginBtn").onclick = async () => {
  authError.textContent = "";
  const res = await login(authUsername.value, authPassword.value);
  if (res.error) return (authError.textContent = res.error);
  startGame(res);
};

document.getElementById("registerBtn").onclick = async () => {
  authError.textContent = "";
  const res = await register(authUsername.value, authPassword.value);
  if (res.error) return (authError.textContent = res.error);
  startGame(res);
};

function startGame(user) {
  game.playerName = user.username;
  game.highScore = user.highScore;

  authModal.classList.add("hidden");
  document.getElementById("gameUI").classList.remove("hidden");

  init();
}

/* ================= GAME INIT ================= */
const modeSelect = document.getElementById("mode");

function init() {
  game.board = Array(9).fill("");
  game.currentPlayer = "X";
  game.gameEnded = false;
  clearAnimations(game.boardEl);

  if (modeSelect.value === "offline") {
    startOffline(game);
    renderBoard(game.board, game.boardEl, i => handleOfflineMove(i, game));
  } else if (modeSelect.value === "ai") {
    startAI(game);
    renderBoard(game.board, game.boardEl, i => handleAIMove(i, game));
  } else {
    startMultiplayer(game, socket);
  }
}

modeSelect.onchange = init;

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
