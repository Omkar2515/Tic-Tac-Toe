/**
 * Main Game Logic Handler
 */

class TicTacToeGame {
    constructor() {
        this.board = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.gameMode = null; // 'pvp-local', 'vs-ai', 'online'
        this.difficulty = 'medium';
        this.gameActive = false;
        this.ai = new TicTacToeAI();
        this.moves = [];
        this.startTime = null;
        
        // Session scores
        this.scores = {
            player1: { wins: 0, draws: 0 },
            player2: { wins: 0, draws: 0 }
        };

        this.winningLines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.cells = document.querySelectorAll('.cell');
        this.turnIndicator = document.getElementById('turnIndicator');
        this.turnText = document.getElementById('turnText');
        this.player1Panel = document.getElementById('player1Panel');
        this.player2Panel = document.getElementById('player2Panel');
        this.player1Name = document.getElementById('player1Name');
        this.player2Name = document.getElementById('player2Name');
        this.player1Wins = document.getElementById('player1Wins');
        this.player1Draws = document.getElementById('player1Draws');
        this.player2Wins = document.getElementById('player2Wins');
        this.player2Draws = document.getElementById('player2Draws');
        this.gameBoard = document.getElementById('gameBoard');
        this.resultModal = document.getElementById('resultModal');
    }

    bindEvents() {
        this.cells.forEach(cell => {
            cell.addEventListener('click', (e) => this.handleCellClick(e));
        });

        document.getElementById('resetGameBtn').addEventListener('click', () => this.resetGame());
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            this.closeModal();
            this.resetGame();
        });
        document.getElementById('backToMenuBtn').addEventListener('click', () => {
            this.closeModal();
            this.quitGame();
        });
        document.getElementById('quitGameBtn').addEventListener('click', () => this.quitGame());
    }

    startGame(mode, difficulty = 'medium') {
        this.gameMode = mode;
        this.difficulty = difficulty;
        this.ai.setDifficulty(difficulty);
        this.gameActive = true;
        this.startTime = Date.now();
        this.moves = [];
        
        this.resetBoard();
        this.updateUI();
        
        // Set player names based on mode
        if (mode === 'vs-ai') {
            this.player1Name.textContent = this.getPlayerName();
            this.player2Name.textContent = `AI (${this.capitalize(difficulty)})`;
        } else if (mode === 'pvp-local') {
            this.player1Name.textContent = 'Player 1';
            this.player2Name.textContent = 'Player 2';
        }

        // Show game container
        document.getElementById('modeSelection').style.display = 'none';
        document.getElementById('gameContainer').classList.add('active');
        document.getElementById('onlineSection').classList.remove('active');
    }

    getPlayerName() {
        const user = JSON.parse(localStorage.getItem('user'));
        return user ? user.username : 'Player';
    }

    handleCellClick(e) {
        if (!this.gameActive) return;
        if (this.gameMode === 'online') return; // Handled separately

        const index = parseInt(e.target.dataset.index);
        
        if (this.board[index] !== null) return;

        // Make the move
        this.makeMove(index);

        // Check for game end
        const result = this.checkGameEnd();
        if (result) {
            this.endGame(result);
            return;
        }

        // AI move for vs-ai mode
        if (this.gameMode === 'vs-ai' && this.currentPlayer === 'O') {
            this.gameActive = false; // Temporarily disable
            setTimeout(() => {
                this.makeAIMove();
            }, 500);
        }
    }

    makeMove(index) {
        this.board[index] = this.currentPlayer;
        this.moves.push({ index, player: this.currentPlayer });
        
        const cell = this.cells[index];
        cell.textContent = this.currentPlayer;
        cell.classList.add('taken', this.currentPlayer.toLowerCase());
        
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        this.updateTurnIndicator();
    }

    makeAIMove() {
        const move = this.ai.getMove(this.board);
        
        if (move !== null && move !== undefined) {
            this.makeMove(move);
            
            const result = this.checkGameEnd();
            if (result) {
                this.endGame(result);
            } else {
                this.gameActive = true;
            }
        }
    }

    checkGameEnd() {
        // Check for winner
        for (const line of this.winningLines) {
            const [a, b, c] = line;
            if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
                return { winner: this.board[a], line };
            }
        }

        // Check for draw
        if (this.board.every(cell => cell !== null)) {
            return { winner: 'draw', line: null };
        }

        return null;
    }

    endGame(result) {
        this.gameActive = false;
        const duration = Math.floor((Date.now() - this.startTime) / 1000);

        // Highlight winning cells
        if (result.line) {
            result.line.forEach(index => {
                this.cells[index].classList.add('winning');
            });
        }

        // Update scores
        let playerResult;
        if (result.winner === 'draw') {
            this.scores.player1.draws++;
            this.scores.player2.draws++;
            playerResult = 'draw';
        } else if (result.winner === 'X') {
            this.scores.player1.wins++;
            playerResult = this.gameMode === 'vs-ai' ? 'win' : null;
        } else {
            this.scores.player2.wins++;
            playerResult = this.gameMode === 'vs-ai' ? 'loss' : null;
        }

        this.updateScoreDisplay();

        // Save result to server if logged in
        if (this.gameMode === 'vs-ai' && playerResult) {
            this.saveGameResult(playerResult, duration);
        }

        // Show result modal
        setTimeout(() => {
            this.showResultModal(result, playerResult);
        }, 500);
    }

    async saveGameResult(result, duration) {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch('/api/game/result', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    result,
                    gameMode: 'vs_ai',
                    aiDifficulty: this.difficulty,
                    moves: this.moves,
                    duration
                })
            });

            if (response.ok) {
                const data = await response.json();
                // Update local user data
                localStorage.setItem('user', JSON.stringify(data.user));
                window.dispatchEvent(new CustomEvent('userUpdated', { detail: data.user }));
            }
        } catch (error) {
            console.error('Failed to save game result:', error);
        }
    }

    showResultModal(result, playerResult) {
        const resultIcon = document.getElementById('resultIcon');
        const resultTitle = document.getElementById('resultTitle');
        const resultMessage = document.getElementById('resultMessage');
        const resultStats = document.getElementById('resultStats');

        if (result.winner === 'draw') {
            resultIcon.textContent = '🤝';
            resultIcon.classList.remove('win');
            resultTitle.textContent = "It's a Draw!";
            resultTitle.className = 'result-title draw';
            resultMessage.textContent = 'Great game! You both played well.';
        } else if (playerResult === 'win' || (this.gameMode === 'pvp-local' && result.winner === 'X')) {
            resultIcon.textContent = '🎉';
            resultIcon.classList.add('win');
            resultTitle.textContent = 'Victory!';
            resultTitle.className = 'result-title win';
            resultMessage.textContent = this.gameMode === 'vs-ai' 
                ? 'Congratulations! You defeated the AI!' 
                : `${result.winner} wins the game!`;
        } else {
            resultIcon.textContent = '😔';
            resultIcon.classList.remove('win');
            resultTitle.textContent = 'Defeat';
            resultTitle.className = 'result-title lose';
            resultMessage.textContent = 'Better luck next time!';
        }

        // Show/hide stats based on login status
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && this.gameMode === 'vs-ai') {
            document.getElementById('resultPoints').textContent = 
                playerResult === 'win' ? '+10' : playerResult === 'loss' ? '-3' : '+2';
            document.getElementById('resultStreak').textContent = user.win_streak || 0;
            resultStats.style.display = 'flex';
        } else {
            resultStats.style.display = 'none';
        }

        this.resultModal.classList.add('active');
    }

    closeModal() {
        this.resultModal.classList.remove('active');
    }

    resetGame() {
        this.resetBoard();
        this.currentPlayer = 'X';
        this.gameActive = true;
        this.startTime = Date.now();
        this.moves = [];
        this.updateTurnIndicator();
    }

    resetBoard() {
        this.board = Array(9).fill(null);
        this.cells.forEach(cell => {
            cell.textContent = '';
            cell.className = 'cell';
        });
    }

    quitGame() {
        this.gameActive = false;
        this.resetBoard();
        this.scores = {
            player1: { wins: 0, draws: 0 },
            player2: { wins: 0, draws: 0 }
        };
        this.updateScoreDisplay();
        
        document.getElementById('gameContainer').classList.remove('active');
        document.getElementById('modeSelection').style.display = 'block';
    }

    updateTurnIndicator() {
        this.turnText.textContent = `${this.currentPlayer}'s Turn`;
        this.turnIndicator.className = `turn-indicator ${this.currentPlayer.toLowerCase()}-turn`;
        
        // Update panel highlighting
        if (this.currentPlayer === 'X') {
            this.player1Panel.classList.add('active');
            this.player2Panel.classList.remove('active');
        } else {
            this.player1Panel.classList.remove('active');
            this.player2Panel.classList.add('active');
        }
    }

    updateScoreDisplay() {
        this.player1Wins.textContent = this.scores.player1.wins;
        this.player1Draws.textContent = this.scores.player1.draws;
        this.player2Wins.textContent = this.scores.player2.wins;
        this.player2Draws.textContent = this.scores.player2.draws;
    }

    updateUI() {
        this.updateTurnIndicator();
        this.updateScoreDisplay();
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // For online game - update board from server
    updateBoardFromServer(boardState, currentTurn) {
        this.board = boardState;
        this.currentPlayer = currentTurn;
        
        this.cells.forEach((cell, index) => {
            cell.textContent = boardState[index] || '';
            cell.className = 'cell';
            if (boardState[index]) {
                cell.classList.add('taken', boardState[index].toLowerCase());
            }
        });
        
        this.updateTurnIndicator();
    }
}

// Export for use
window.TicTacToeGame = TicTacToeGame;