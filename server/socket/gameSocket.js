const pool = require('../config/database');
const jwt = require('jsonwebtoken');

// Active rooms storage
const rooms = new Map();
const userSockets = new Map();

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function checkWinner(board) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6] // Diagonals
    ];

    for (const [a, b, c] of lines) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { winner: board[a], line: [a, b, c] };
        }
    }

    if (board.every(cell => cell !== null)) {
        return { winner: 'draw', line: null };
    }

    return null;
}

function initializeSocket(io) {
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                socket.user = decoded;
            } catch (error) {
                console.log('Invalid token, continuing as guest');
            }
        }
        next();
    });

    io.on('connection', (socket) => {
        console.log(`🔌 User connected: ${socket.id}`, socket.user?.username || 'Guest');

        if (socket.user) {
            userSockets.set(socket.user.id, socket.id);
        }

        // Create room
        socket.on('create-room', async (callback) => {
            try {
                const roomCode = generateRoomCode();
                const room = {
                    code: roomCode,
                    players: [{
                        id: socket.id,
                        oderId: socket.user?.id,
                        username: socket.user?.username || 'Player 1',
                        symbol: 'X'
                    }],
                    board: Array(9).fill(null),
                    currentTurn: 'X',
                    status: 'waiting',
                    moves: []
                };

                rooms.set(roomCode, room);
                socket.join(roomCode);
                socket.roomCode = roomCode;

                console.log(`🏠 Room created: ${roomCode}`);
                callback({ success: true, roomCode, room });
            } catch (error) {
                console.error('Create room error:', error);
                callback({ success: false, error: 'Failed to create room' });
            }
        });

        // Join room
        socket.on('join-room', async (roomCode, callback) => {
            try {
                const room = rooms.get(roomCode.toUpperCase());

                if (!room) {
                    return callback({ success: false, error: 'Room not found' });
                }

                if (room.players.length >= 2) {
                    return callback({ success: false, error: 'Room is full' });
                }

                if (room.status !== 'waiting') {
                    return callback({ success: false, error: 'Game already in progress' });
                }

                room.players.push({
                    id: socket.id,
                    oderId: socket.user?.id,
                    username: socket.user?.username || 'Player 2',
                    symbol: 'O'
                });
                room.status = 'playing';

                socket.join(roomCode);
                socket.roomCode = roomCode;

                // Notify both players
                io.to(roomCode).emit('game-start', {
                    room,
                    message: 'Game started!'
                });

                console.log(`👥 Player joined room: ${roomCode}`);
                callback({ success: true, room });
            } catch (error) {
                console.error('Join room error:', error);
                callback({ success: false, error: 'Failed to join room' });
            }
        });

        // Make move
        socket.on('make-move', async (data, callback) => {
            try {
                const { roomCode, position } = data;
                const room = rooms.get(roomCode);

                if (!room) {
                    return callback({ success: false, error: 'Room not found' });
                }

                const player = room.players.find(p => p.id === socket.id);
                if (!player) {
                    return callback({ success: false, error: 'You are not in this room' });
                }

                if (room.currentTurn !== player.symbol) {
                    return callback({ success: false, error: 'Not your turn' });
                }

                if (room.board[position] !== null) {
                    return callback({ success: false, error: 'Cell already taken' });
                }

                // Make the move
                room.board[position] = player.symbol;
                room.moves.push({ position, symbol: player.symbol, player: player.username });

                // Check for winner
                const result = checkWinner(room.board);

                if (result) {
                    room.status = 'finished';
                    
                    io.to(roomCode).emit('game-over', {
                        winner: result.winner === 'draw' ? null : player,
                        isDraw: result.winner === 'draw',
                        winningLine: result.line,
                        board: room.board
                    });

                    // Update stats in database if users are logged in
                    if (result.winner !== 'draw') {
                        const winner = room.players.find(p => p.symbol === result.winner);
                        const loser = room.players.find(p => p.symbol !== result.winner);

                        if (winner.oderId) {
                            await updateOnlineGameResult(winner.oderId, 'win');
                        }
                        if (loser.oderId) {
                            await updateOnlineGameResult(loser.oderId, 'loss');
                        }
                    } else {
                        for (const p of room.players) {
                            if (p.oderId) {
                                await updateOnlineGameResult(p.oderId, 'draw');
                            }
                        }
                    }
                } else {
                    room.currentTurn = room.currentTurn === 'X' ? 'O' : 'X';
                    
                    io.to(roomCode).emit('move-made', {
                        position,
                        symbol: player.symbol,
                        player: player.username,
                        board: room.board,
                        currentTurn: room.currentTurn
                    });
                }

                callback({ success: true });
            } catch (error) {
                console.error('Make move error:', error);
                callback({ success: false, error: 'Failed to make move' });
            }
        });

        // Rematch request
        socket.on('request-rematch', (roomCode) => {
            const room = rooms.get(roomCode);
            if (room) {
                socket.to(roomCode).emit('rematch-requested', {
                    from: socket.user?.username || 'Opponent'
                });
            }
        });

        // Accept rematch
        socket.on('accept-rematch', (roomCode) => {
            const room = rooms.get(roomCode);
            if (room) {
                // Reset the game
                room.board = Array(9).fill(null);
                room.currentTurn = 'X';
                room.status = 'playing';
                room.moves = [];

                // Swap symbols
                room.players.forEach(p => {
                    p.symbol = p.symbol === 'X' ? 'O' : 'X';
                });

                io.to(roomCode).emit('game-start', {
                    room,
                    message: 'Rematch started!'
                });
            }
        });

        // Leave room
        socket.on('leave-room', (roomCode) => {
            handleLeaveRoom(socket, roomCode, io);
        });

        // Chat message
        socket.on('chat-message', (data) => {
            const { roomCode, message } = data;
            const room = rooms.get(roomCode);
            
            if (room) {
                io.to(roomCode).emit('chat-message', {
                    from: socket.user?.username || 'Anonymous',
                    message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Disconnect
        socket.on('disconnect', () => {
            console.log(`🔌 User disconnected: ${socket.id}`);
            
            if (socket.user) {
                userSockets.delete(socket.user.id);
            }

            if (socket.roomCode) {
                handleLeaveRoom(socket, socket.roomCode, io);
            }
        });
    });
}

function handleLeaveRoom(socket, roomCode, io) {
    const room = rooms.get(roomCode);
    
    if (room) {
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        
        if (playerIndex !== -1) {
            const player = room.players[playerIndex];
            room.players.splice(playerIndex, 1);

            if (room.players.length === 0) {
                rooms.delete(roomCode);
                console.log(`🗑️ Room deleted: ${roomCode}`);
            } else {
                room.status = 'waiting';
                io.to(roomCode).emit('player-left', {
                    player: player.username,
                    room
                });
            }
        }
    }

    socket.leave(roomCode);
    socket.roomCode = null;
}

async function updateOnlineGameResult(userId, result) {
    try {
        const User = require('../models/User');
        await User.updateStats(userId, result);
        
        await pool.execute(
            `INSERT INTO game_history (player1_id, game_mode, result) VALUES (?, 'pvp_online', ?)`,
            [userId, result]
        );
    } catch (error) {
        console.error('Failed to update online game result:', error);
    }
}

module.exports = { initializeSocket };