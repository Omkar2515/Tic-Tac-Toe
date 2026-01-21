/*********************************
 * MongoDB + Express + Socket.IO
 *********************************/

const express = require("express");
const http = require("http");
const path = require("path");
const bcrypt = require("bcrypt");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const User = require("./models/User");

/*********************************
 * MONGODB CONNECTION
 *********************************/
console.log("Attempting MongoDB connection...");

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected SUCCESSFULLY");
  })
  .catch(err => {
    console.error("MongoDB connection FAILED:", err.message);
    process.exit(1);
  });

/*********************************
 * EXPRESS SETUP
 *********************************/
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

/*********************************
 * SESSION SETUP (FIXED)
 *********************************/
app.use(
  session({
    name: "tic-tac-toe-session",
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      client: mongoose.connection.getClient()
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
  })
);

/*********************************
 * SERVE FRONTEND
 *********************************/
app.use(express.static(path.join(__dirname, "../client")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

/*********************************
 * AUTH APIs
 *********************************/

// Register
app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      passwordHash
    });

    req.session.userId = user._id;

    res.json({
      username: user.username,
      highScore: user.highScore
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    req.session.userId = user._id;

    res.json({
      username: user.username,
      highScore: user.highScore
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Session check
app.get("/api/me", async (req, res) => {
  if (!req.session.userId) return res.json(null);

  const user = await User.findById(req.session.userId).select(
    "username highScore"
  );

  res.json(user);
});

/*********************************
 * GAME LOGIC (Socket.IO)
 *********************************/
const games = {};

const winPatterns = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
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
      io.to(roomId).emit("gameOver", {
        winner: player,
        winLine,
        name: game.names[player]
      });
      return;
    }

    if (game.board.every(c => c)) {
      game.gameOver = true;
      io.to(roomId).emit("gameOver", { draw: true });
      return;
    }

    game.currentPlayer = player === "X" ? "O" : "X";
    io.to(roomId).emit("state", game);
  });
});

/*********************************
 * START SERVER
 *********************************/
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
