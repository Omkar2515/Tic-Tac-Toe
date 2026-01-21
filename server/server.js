/*********************************
 * MongoDB + Express + Socket.IO
 *********************************/

require("./db"); // MongoDB connection (db.js)

const express = require("express");
const http = require("http");
const path = require("path");
const bcrypt = require("bcrypt");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const { Server } = require("socket.io");

const User = require("./models/User");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

/*********************************
 * MIDDLEWARE
 *********************************/
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI
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

// Register (New User)
app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    const existing = await User.findOne({ username });
    if (existing) {
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

// Login (Existing User)
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
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

// Get logged-in user (session)
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

  socket.on("restartGame", roomId => {
    const game = games[roomId];
    if (!game) return;

    game.board = Array(9).fill("");
    game.currentPlayer = "X";
    game.gameOver = false;

    io.to(roomId).emit("state", game);
  });

  socket.on("clearScore", roomId => {
    const game = games[roomId];
    if (!game) return;

    game.score = { X: 0, O: 0 };
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
