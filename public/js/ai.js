/**
 * Tic Tac Toe AI with Minimax Algorithm
 * Includes win-blocking logic and difficulty levels
 */

class TicTacToeAI {
    constructor(difficulty = 'medium') {
        this.difficulty = difficulty;
        this.aiSymbol = 'O';
        this.playerSymbol = 'X';
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;
    }

    setSymbols(aiSymbol, playerSymbol) {
        this.aiSymbol = aiSymbol;
        this.playerSymbol = playerSymbol;
    }

    getMove(board) {
        switch (this.difficulty) {
            case 'easy':
                return this.getEasyMove(board);
            case 'medium':
                return this.getMediumMove(board);
            case 'hard':
                return this.getHardMove(board);
            case 'impossible':
                return this.getImpossibleMove(board);
            default:
                return this.getMediumMove(board);
        }
    }

    // Easy: Random moves
    getEasyMove(board) {
        const availableMoves = this.getAvailableMoves(board);
        return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }

    // Medium: 50% optimal, 50% random + always block wins
    getMediumMove(board) {
        // Always try to win
        const winningMove = this.findWinningMove(board, this.aiSymbol);
        if (winningMove !== null) return winningMove;

        // Always block opponent's winning move
        const blockingMove = this.findWinningMove(board, this.playerSymbol);
        if (blockingMove !== null) return blockingMove;

        // 50% chance to make optimal move
        if (Math.random() < 0.5) {
            return this.getBestMove(board);
        }

        return this.getEasyMove(board);
    }

    // Hard: 80% optimal + always blocks + tries to win
    getHardMove(board) {
        // Always try to win
        const winningMove = this.findWinningMove(board, this.aiSymbol);
        if (winningMove !== null) return winningMove;

        // Always block opponent's winning move
        const blockingMove = this.findWinningMove(board, this.playerSymbol);
        if (blockingMove !== null) return blockingMove;

        // 80% chance for optimal move
        if (Math.random() < 0.8) {
            return this.getBestMove(board);
        }

        // Take center or corners strategically
        return this.getStrategicMove(board);
    }

    // Impossible: Perfect play using Minimax
    getImpossibleMove(board) {
        return this.getBestMove(board);
    }

    // Find a winning move for the given player
    findWinningMove(board, symbol) {
        const availableMoves = this.getAvailableMoves(board);
        
        for (const move of availableMoves) {
            const testBoard = [...board];
            testBoard[move] = symbol;
            if (this.checkWinner(testBoard) === symbol) {
                return move;
            }
        }
        return null;
    }

    // Get strategic move (center, corners, edges priority)
    getStrategicMove(board) {
        const availableMoves = this.getAvailableMoves(board);
        
        // Prefer center
        if (availableMoves.includes(4)) return 4;
        
        // Then corners
        const corners = [0, 2, 6, 8].filter(c => availableMoves.includes(c));
        if (corners.length > 0) {
            return corners[Math.floor(Math.random() * corners.length)];
        }
        
        // Then edges
        return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }

    // Minimax algorithm for best move
    getBestMove(board) {
        let bestScore = -Infinity;
        let bestMove = null;
        const availableMoves = this.getAvailableMoves(board);

        for (const move of availableMoves) {
            const newBoard = [...board];
            newBoard[move] = this.aiSymbol;
            const score = this.minimax(newBoard, 0, false, -Infinity, Infinity);
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove;
    }

    // Minimax with alpha-beta pruning
    minimax(board, depth, isMaximizing, alpha, beta) {
        const winner = this.checkWinner(board);
        
        // Terminal states
        if (winner === this.aiSymbol) return 10 - depth;
        if (winner === this.playerSymbol) return depth - 10;
        if (this.getAvailableMoves(board).length === 0) return 0;

        if (isMaximizing) {
            let maxScore = -Infinity;
            for (const move of this.getAvailableMoves(board)) {
                const newBoard = [...board];
                newBoard[move] = this.aiSymbol;
                const score = this.minimax(newBoard, depth + 1, false, alpha, beta);
                maxScore = Math.max(maxScore, score);
                alpha = Math.max(alpha, score);
                if (beta <= alpha) break; // Alpha-beta pruning
            }
            return maxScore;
        } else {
            let minScore = Infinity;
            for (const move of this.getAvailableMoves(board)) {
                const newBoard = [...board];
                newBoard[move] = this.playerSymbol;
                const score = this.minimax(newBoard, depth + 1, true, alpha, beta);
                minScore = Math.min(minScore, score);
                beta = Math.min(beta, score);
                if (beta <= alpha) break; // Alpha-beta pruning
            }
            return minScore;
        }
    }

    getAvailableMoves(board) {
        return board.reduce((moves, cell, index) => {
            if (cell === null) moves.push(index);
            return moves;
        }, []);
    }

    checkWinner(board) {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6] // Diagonals
        ];

        for (const [a, b, c] of lines) {
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return board[a];
            }
        }
        return null;
    }
}

// Export for use in other files
window.TicTacToeAI = TicTacToeAI;