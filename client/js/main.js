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

  boardEl: document.getElementById("board"),
  statusEl: document.getElementById("status"),
  inviteBox: document.getElementById("inviteBox"),

  playerXEl: document.getElementById("playerX"),
  playerOEl: document.getElementById("playerO"),
  xScoreEl: document.getElementById("xScore"),
  oScoreEl: document.getElementById("oScore"),

  updateScore() {
    this.xScoreEl.textContent = this.scores.X;
    this.oScoreEl.textContent = this.scores.O;
  }
};

/* ================= ELEMENTS ================= */
const modal = document.getElementById("nameModal");
const startBtn = document.getElementById("startBtn");
const nameInput = document.getElementById("nameInput");

const modeSelect = document.getElementById("mode");
const restartBtn = document.getElementById("restartBtn");
const clearScoreBtn = document.getElementById("clearScoreBtn");

/* ================= START ================= */
startBtn.onclick = () => {
  const name = nameInput.value.trim();
  if (!name) return;

  game.playerName = name;

  modal.classList.add("hidden");
  document.getElementById("gameUI").classList.remove("hidden");

  init();
};

modeSelect.onchange = init;

/* ================= BUTTONS (FIXED) ================= */
restartBtn.onclick = () => {
  clearAnimations(game.boardEl);
  game.gameEnded = false;

  if (modeSelect.value === "online") {
    socket.emit("restartGame", game.roomId);
  } else {
    game.board = Array(9).fill("");
    game.currentPlayer = "X";
    game.statusEl.textContent =
      modeSelect.value === "offline"
        ? "Player X's turn"
        : "Your turn";
    render();
  }
};

clearScoreBtn.onclick = () => {
  game.scores = { X: 0, O: 0 };
  game.updateScore();

  if (modeSelect.value === "online") {
    socket.emit("clearScore", game.roomId);
  }
};

/* ================= INIT ================= */
function init() {
  game.board = Array(9).fill("");
  game.currentPlayer = "X";
  game.gameEnded = false;
  clearAnimations(game.boardEl);

  const mode = modeSelect.value;

  if (mode === "offline") {
    game.inviteBox.style.display = "none";
    game.playerXEl.textContent = `X : ${game.playerName}`;
    game.playerOEl.textContent = "O : Player 2";
    game.statusEl.textContent = "Player X's turn";
    renderBoard(game.board, game.boardEl, i => handleOfflineMove(i, game));
  }
  else if (mode === "ai") {
    game.inviteBox.style.display = "none";
    game.playerXEl.textContent = `X : ${game.playerName}`;
    game.playerOEl.textContent = "O : AI";
    game.statusEl.textContent = "Your turn";
    renderBoard(game.board, game.boardEl, i => handleAIMove(i, game));
  }
  else {
    game.inviteBox.style.display = "block";
    game.roomId =
      new URLSearchParams(location.search).get("room")
      || Math.random().toString(36).slice(2,8).toUpperCase();

    startMultiplayer(game, socket);
  }
}

/* ================= RENDER ================= */
function render() {
  renderBoard(game.board, game.boardEl, i => {
    if (modeSelect.value === "offline")
      handleOfflineMove(i, game);
    else
      handleAIMove(i, game);
  });
}
