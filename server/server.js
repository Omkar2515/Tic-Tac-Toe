const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

/* ===============================
   SERVE FRONTEND (Render root = server)
================================ */
const CLIENT_PATH = path.join(__dirname, "..", "client");
app.use(express.static(CLIENT_PATH));

app.get("/", (req, res) => {
  res.sendFile(path.join(CLIENT_PATH, "index.html"));
});

/* ===============================
   GAME LOGIC
================================ */
const games = {};

const winPatterns = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

function getWinLine(board, player) {
  return winPatterns.find(p => p.every(i => board[i] === player));
}

io.on("connection", socket => {

  socket.on("joinRoom", ({ roomId, name }) => {
    socket.join(roomId);

    if (!games[roomId]) {
      games[roomId] = {
        board: Array(9).fill(""),
        currentPlayer: "X",
        players: {},
        names: {},
        gameOver: false,
        score: { X: 0, O: 0 }
      };
    }

    const game = games[roomId];

    if (!game.players[socket.id]) {
      const roles = Object.values(game.players);
      if (!roles.includes("X")) {
        game.players[socket.id] = "X";
        game.names.X = name;
      } else if (!roles.includes("O")) {
        game.players[socket.id] = "O";
        game.names.O = name;
      } else {
        game.players[socket.id] = "SPECTATOR";
      }
    }

    socket.emit("role", game.players[socket.id]);
    io.to(roomId).emit("state", game);
  });

  socket.on("makeMove", ({ roomId, index }) => {
    const game = games[roomId];
    if (!game || game.gameOver) return;

    const player = game.players[socket.id];
    if (player !== game.currentPlayer) return;
    if (game.board[index]) return;

    game.board[index] = player;

    const winLine = getWinLine(game.board, player);
    if (winLine) {
      game.gameOver = true;
      game.score[player]++;

      // ✅ send final board FIRST
      io.to(roomId).emit("state", game);

      io.to(roomId).emit("gameOver", {
        winner: player,
        winLine,
        name: game.names[player]
      });
      return;
    }

    if (game.board.every(c => c)) {
      game.gameOver = true;

      io.to(roomId).emit("state", game);
      io.to(roomId).emit("gameOver", { draw: true });
      return;
    }

    game.currentPlayer = player === "X" ? "O" : "X";
    io.to(roomId).emit("state", game);
  });

  socket.on("restartGame", roomId => {
    const game = games[roomId];
    if (!game) return;

    game.board = Array(9).fill("");
    game.currentPlayer = "X";
    game.gameOver = false;

    io.to(roomId).emit("state", {
      ...game,
      restarted: true
    });
  });

  socket.on("clearScore", roomId => {
    const game = games[roomId];
    if (!game) return;

    game.score = { X: 0, O: 0 };
    io.to(roomId).emit("state", game);
  });
});

/* ===============================
   START SERVER
================================ */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
