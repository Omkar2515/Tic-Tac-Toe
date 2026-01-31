-- Create Database
CREATE DATABASE IF NOT EXISTS tictactoe;
USE tictactoe;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    draws INT DEFAULT 0,
    total_games INT DEFAULT 0,
    win_streak INT DEFAULT 0,
    best_win_streak INT DEFAULT 0,
    points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Game History Table
CREATE TABLE IF NOT EXISTS game_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    player1_id INT,
    player2_id INT NULL,
    winner_id INT NULL,
    game_mode ENUM('pvp_local', 'pvp_online', 'vs_ai') NOT NULL,
    ai_difficulty ENUM('easy', 'medium', 'hard', 'impossible') NULL,
    result ENUM('win', 'loss', 'draw') NOT NULL,
    moves TEXT,
    duration_seconds INT,
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Online Rooms Table
CREATE TABLE IF NOT EXISTS game_rooms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_code VARCHAR(10) UNIQUE NOT NULL,
    player1_id INT NOT NULL,
    player2_id INT NULL,
    status ENUM('waiting', 'playing', 'finished') DEFAULT 'waiting',
    current_turn INT,
    board_state VARCHAR(20) DEFAULT '---------',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Sessions Table for Express Session (optional, for persistent sessions)
CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(128) PRIMARY KEY,
    expires INT UNSIGNED NOT NULL,
    data MEDIUMTEXT
);

-- Create indexes for better performance
CREATE INDEX idx_users_points ON users(points DESC);
CREATE INDEX idx_users_wins ON users(wins DESC);
CREATE INDEX idx_game_history_player ON game_history(player1_id);
CREATE INDEX idx_rooms_status ON game_rooms(status);
CREATE INDEX idx_rooms_code ON game_rooms(room_code);