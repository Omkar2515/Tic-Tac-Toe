import { renderBoard } from "./ui.js";
import { startMultiplayer } from "./multiplayer.js";

const boardEl = document.getElementById("board");
const modeSelect = document.getElementById("modeSelect");

let game = {
  board: Array(9).fill(""),
  currentPlayer: "X",
  gameEnded: false,
  room: null
};

let socket = null;

// ---------- GAME LOGIC ----------
function onCellClick(index) {
  if (game.gameEnded) return;

  if (modeSelect.value === "Online Multiplayer") {
    socket.emit("move", index);
    return;
  }

  if (game.board[index]) return;

  game.board[index] = game.currentPlayer;
  game.currentPlayer = game.currentPlayer === "X" ? "O" : "X";
  render();
}

function render() {
  renderBoard(game.board, boardEl, onCellClick);
}

// ---------- START GAME ----------
function startGame() {
  game.board = Array(9).fill("");
  game.currentPlayer = "X";
  game.gameEnded = false;

  if (modeSelect.value === "Online Multiplayer") {
    socket = io();
    startMultiplayer(game, socket);
  }

  render();
}

// ---------- INIT ----------
window.addEventListener("DOMContentLoaded", () => {
  if (!boardEl || !modeSelect) {
    console.error("Required DOM elements missing");
    return;
  }

  modeSelect.addEventListener("change", startGame);
  startGame();
});
