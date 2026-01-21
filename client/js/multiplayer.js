export function startMultiplayer(game, socket) {
  let room = new URLSearchParams(window.location.search).get("room");

  if (!room) {
    room = Math.random().toString(36).substring(2, 8);
    history.replaceState({}, "", `?room=${room}`);
  }

  game.room = room;

  socket.emit("joinRoom", room);

  socket.on("start", symbol => {
    game.currentPlayer = symbol;
  });

  socket.on("update", data => {
    game.board = data.board;
    game.currentPlayer = data.currentPlayer;
    game.gameEnded = data.gameEnded;
  });
}
