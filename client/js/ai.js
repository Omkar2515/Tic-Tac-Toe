import { minimax, checkWinner } from "./engine.js";
import { renderBoard, animateWin } from "./ui.js";

export function startAI(game) {
  game.inviteBox.style.display = "none";
  game.statusEl.textContent = "Your turn";
}

export function handleAIMove(i, game) {
  if (game.board[i] || game.gameEnded) return;

  game.board[i] = "X";
  if (finish(game, "X")) return;

  setTimeout(() => aiTurn(game), 300);
}

function aiTurn(game) {
  if (game.gameEnded) return;
  const move = minimax(game.board, "O").index;
  game.board[move] = "O";
  finish(game, "O");
}

function finish(game, player) {
  const win = checkWinner(game.board, player);
  if (win) {
    game.gameEnded = true;
    game.scores[player]++;
    game.updateScore();
    animateWin(game.boardEl, win);
    game.statusEl.textContent = `${player} wins`;
    return true;
  }
  renderBoard(game.board, game.boardEl, i => handleAIMove(i, game));
  return false;
}
