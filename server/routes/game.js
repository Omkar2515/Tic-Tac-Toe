const express = require('express');
const User = require('../models/User');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Update game result
router.post('/result', authenticateToken, async (req, res) => {
    try {
        const { result, gameMode, aiDifficulty, moves, duration } = req.body;
        const userId = req.user.id;

        // Update user stats
        const updatedUser = await User.updateStats(userId, result);

        // Save game history
        await pool.execute(
            `INSERT INTO game_history 
            (player1_id, game_mode, ai_difficulty, result, moves, duration_seconds) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, gameMode, aiDifficulty || null, result, JSON.stringify(moves), duration || 0]
        );

        const rank = await User.getUserRank(userId);

        res.json({
            message: 'Game result saved',
            user: { ...updatedUser, rank }
        });
    } catch (error) {
        console.error('Save game result error:', error);
        res.status(500).json({ error: 'Failed to save game result' });
    }
});

// Get user stats
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const rank = await User.getUserRank(req.user.id);

        // Get recent games
        const [recentGames] = await pool.execute(
            `SELECT game_mode, ai_difficulty, result, played_at 
            FROM game_history 
            WHERE player1_id = ? 
            ORDER BY played_at DESC 
            LIMIT 10`,
            [req.user.id]
        );

        res.json({
            stats: {
                ...user,
                rank,
                winRate: user.total_games > 0 
                    ? ((user.wins / user.total_games) * 100).toFixed(1) 
                    : 0
            },
            recentGames
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Session score (stored in express session)
router.get('/session-score', (req, res) => {
    if (!req.session.gameScore) {
        req.session.gameScore = { wins: 0, losses: 0, draws: 0 };
    }
    res.json(req.session.gameScore);
});

router.post('/session-score', (req, res) => {
    const { result } = req.body;
    if (!req.session.gameScore) {
        req.session.gameScore = { wins: 0, losses: 0, draws: 0 };
    }

    switch (result) {
        case 'win':
            req.session.gameScore.wins++;
            break;
        case 'loss':
            req.session.gameScore.losses++;
            break;
        case 'draw':
            req.session.gameScore.draws++;
            break;
    }

    res.json(req.session.gameScore);
});

router.post('/session-score/reset', (req, res) => {
    req.session.gameScore = { wins: 0, losses: 0, draws: 0 };
    res.json(req.session.gameScore);
});

module.exports = router;