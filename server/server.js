const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const leaderboardRoutes = require('./routes/leaderboard');
const { initializeSocket } = require('./socket/gameSocket');

const app = express();
const server = http.createServer(app);

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production';

const io = new Server(server, {
    cors: {
        origin: isProduction ? false : ['http://localhost:3000', 'http://127.0.0.1:3000'],
        credentials: true
    }
});

// Trust proxy for Render
if (isProduction) {
    app.set('trust proxy', 1);
}

// Middleware
app.use(cors({
    origin: isProduction ? false : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: isProduction ? 'strict' : 'lax'
    }
}));

// Get the correct public path
const publicPath = path.resolve(__dirname, '..', 'public');

console.log('========================================');
console.log('🌍 Environment:', isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
console.log('📁 Public folder path:', publicPath);
console.log('📁 Public folder exists:', fs.existsSync(publicPath));
console.log('========================================');

// Serve CSS files with correct MIME type
app.get('/css/:filename', (req, res) => {
    const filePath = path.join(publicPath, 'css', req.params.filename);
    
    if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'text/css');
        res.sendFile(filePath);
    } else {
        res.status(404).send('CSS file not found');
    }
});

// Serve JS files with correct MIME type
app.get('/js/:filename', (req, res) => {
    const filePath = path.join(publicPath, 'js', req.params.filename);
    
    if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/javascript');
        res.sendFile(filePath);
    } else {
        res.status(404).send('JS file not found');
    }
});

// Static files
app.use(express.static(publicPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve HTML pages
app.get('/login', (req, res) => {
    res.sendFile(path.join(publicPath, 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(publicPath, 'register.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// Handle 404 - serve index.html for SPA-like behavior
app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// Initialize Socket.IO
initializeSocket(io);

// Error handling
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
    🎮 Tic Tac Toe Server Running!
    📍 Port: ${PORT}
    🌍 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}
    `);
});