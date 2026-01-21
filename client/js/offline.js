import { checkWinner } from "./engine.js";
import { renderBoard, animateWin } from "./ui.js";

export function startOffline(game) {
  game.inviteBox.style.display = "none";
  game.statusEl.textContent = "Player X's turn";
}

export function handleOfflineMove(i, game) {
  if (game.board[i] || game.gameEnded) return;

  game.board[i] = game.currentPlayer;
  const win = checkWinner(game.board, game.currentPlayer);
  if (win) {
    game.gameEnded = true;
    game.scores[game.currentPlayer]++;
    game.updateScore();
    animateWin(game.boardEl, win);
    game.statusEl.textContent = `${game.currentPlayer} wins`;
    return;
  }

  game.currentPlayer = game.currentPlayer === "X" ? "O" : "X";
  game.statusEl.textContent = `Player ${game.currentPlayer}'s turn`;
  renderBoard(game.board, game.boardEl, idx => handleOfflineMove(idx, game));
}
