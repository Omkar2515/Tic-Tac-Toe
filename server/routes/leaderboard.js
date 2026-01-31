const express = require('express');
const pool = require('../config/database');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get leaderboard
router.get('/', optionalAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        // Get leaderboard - simple query
        const [leaderboard] = await pool.execute(
            `SELECT id, username, wins, losses, draws, total_games, best_win_streak, points
            FROM users 
            ORDER BY points DESC, wins DESC 
            LIMIT ${limit} OFFSET ${offset}`
        );

        // Add rank manually
        const rankedLeaderboard = leaderboard.map((player, index) => ({
            ...player,
            rank: offset + index + 1
        }));

        let currentUser = null;

        // Get current user info if logged in
        if (req.user && req.user.id) {
            try {
                const [userRows] = await pool.execute(
                    'SELECT id, username, wins, losses, draws, total_games, best_win_streak, points FROM users WHERE id = ?',
                    [req.user.id]
                );
                
                if (userRows && userRows.length > 0) {
                    // Get user's rank
                    const [rankResult] = await pool.execute(
                        'SELECT COUNT(*) as count FROM users WHERE points > ?',
                        [userRows[0].points]
                    );
                    currentUser = {
                        ...userRows[0],
                        rank: (rankResult[0]?.count || 0) + 1
                    };
                }
            } catch (userError) {
                console.error('Error getting current user:', userError);
            }
        }

        res.json({
            leaderboard: rankedLeaderboard,
            currentUser
        });

    } catch (error) {
        console.error('Leaderboard error:', error);
        // Return empty leaderboard instead of error
        res.json({ 
            leaderboard: [],
            currentUser: null
        });
    }
});

module.exports = router;