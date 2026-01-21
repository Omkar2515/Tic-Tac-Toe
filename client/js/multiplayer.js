const { Server } = require("socket.io");

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const rooms = {};

io.on("connection", socket => {

  socket.on("joinRoom", room => {
    socket.join(room);

    if (!rooms[room]) {
      rooms[room] = {
        board: Array(9).fill(""),
        currentPlayer: "X",
        players: []
      };
    }

    rooms[room].players.push(socket.id);

    const symbol = rooms[room].players.length === 1 ? "X" : "O";
    socket.emit("start", symbol);
  });

  socket.on("move", index => {
    const room = [...socket.rooms][1];
    if (!room) return;

    const game = rooms[room];
    if (!game || game.board[index]) return;

    game.board[index] = game.currentPlayer;
    game.currentPlayer = game.currentPlayer === "X" ? "O" : "X";

    io.to(room).emit("update", {
      board: game.board,
      currentPlayer: game.currentPlayer,
      gameEnded: false
    });
  });

  socket.on("disconnect", () => {
    for (const room in rooms) {
      rooms[room].players = rooms[room].players.filter(id => id !== socket.id);
      if (rooms[room].players.length === 0) {
        delete rooms[room];
      }
    }
  });
});
