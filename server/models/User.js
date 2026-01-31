const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    static async create(username, password) {
        const hashedPassword = await bcrypt.hash(password, 12);
        const [result] = await pool.execute(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hashedPassword]
        );
        return result.insertId;
    }

    static async findByUsername(username) {
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await pool.execute(
            'SELECT id, username, wins, losses, draws, total_games, win_streak, best_win_streak, points, created_at FROM users WHERE id = ?',
            [id]
        );
        return rows[0];
    }

    static async updateStats(userId, result) {
        const user = await this.findById(userId);
        if (!user) return null;

        let wins = user.wins;
        let losses = user.losses;
        let draws = user.draws;
        let winStreak = user.win_streak;
        let bestWinStreak = user.best_win_streak;
        let points = user.points;

        switch (result) {
            case 'win':
                wins++;
                winStreak++;
                points += 10;
                if (winStreak > bestWinStreak) {
                    bestWinStreak = winStreak;
                    points += 5;
                }
                break;
            case 'loss':
                losses++;
                winStreak = 0;
                points = Math.max(0, points - 3);
                break;
            case 'draw':
                draws++;
                points += 2;
                break;
        }

        await pool.execute(
            `UPDATE users SET 
                wins = ?, losses = ?, draws = ?, 
                total_games = total_games + 1,
                win_streak = ?, best_win_streak = ?,
                points = ?
            WHERE id = ?`,
            [wins, losses, draws, winStreak, bestWinStreak, points, userId]
        );

        return await this.findById(userId);
    }

    static async getLeaderboard(limit = 10, offset = 0) {
        const [rows] = await pool.execute(
            `SELECT id, username, wins, losses, draws, total_games, best_win_streak, points
            FROM users 
            ORDER BY points DESC, wins DESC 
            LIMIT ? OFFSET ?`,
            [String(limit), String(offset)]
        );
        
        return rows.map((row, index) => ({
            ...row,
            rank: offset + index + 1
        }));
    }

    static async getUserRank(userId) {
        try {
            const [rows] = await pool.execute(
                'SELECT COUNT(*) as count FROM users WHERE points > (SELECT points FROM users WHERE id = ?)',
                [userId]
            );
            return rows[0].count + 1;
        } catch (error) {
            console.error('Get rank error:', error);
            return null;
        }
    }

    static async validatePassword(user, password) {
        return bcrypt.compare(password, user.password);
    }
}

module.exports = User;