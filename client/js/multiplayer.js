import { renderBoard, animateWin, clearAnimations } from "./ui.js";

export function startMultiplayer(game, socket) {
  const roomId = game.roomId;
  history.replaceState({}, "", `?room=${roomId}`);
  document.getElementById("roomLink").textContent = location.href;

  socket.off();
  socket.emit("joinRoom", { roomId, name: game.playerName });

  socket.on("state", g => {

    if (g.restarted) {
      game.gameEnded = false;
      clearAnimations(game.boardEl);
    }

    if (game.gameEnded && !g.restarted) return;

    game.board = g.board;
    game.currentPlayer = g.currentPlayer;
    game.scores = g.score;
    game.updateScore();

    game.playerXEl.textContent = `X : ${g.names.X || "Player X"}`;
    game.playerOEl.textContent = `O : ${g.names.O || "Player O"}`;

    renderBoard(game.board, game.boardEl, i =>
      socket.emit("makeMove", { roomId, index: i })
    );

    game.statusEl.textContent =
      game.gameEnded
        ? game.statusEl.textContent
        : game.currentPlayer === "X"
          ? "X's turn"
          : "O's turn";
  });

  socket.on("gameOver", data => {
    game.gameEnded = true;

    if (data.draw) {
      game.statusEl.textContent = "Draw";
      game.boardEl.classList.add("draw");

      [...game.boardEl.children].forEach(c =>
        c.classList.add("lose")
      );
      return;
    }

    animateWin(game.boardEl, data.winLine);
    game.statusEl.textContent = `${data.name} wins`;
  });
}
