/**
 * Online Game Handler with Socket.IO
 */

class OnlineGameHandler {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.roomCode = null;
        this.playerSymbol = null;
        this.isMyTurn = false;
        this.opponent = null;

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.onlineSection = document.getElementById('onlineSection');
        this.roomOptions = document.getElementById('roomOptions');
        this.joinRoomInput = document.getElementById('joinRoomInput');
        this.waitingRoom = document.getElementById('waitingRoom');
        this.displayRoomCode = document.getElementById('displayRoomCode');
        this.roomCodeInput = document.getElementById('roomCodeInput');
        this.onlineChat = document.getElementById('onlineChat');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
    }

    bindEvents() {
        document.getElementById('createRoomBtn').addEventListener('click', () => this.createRoom());
        document.getElementById('joinRoomBtn').addEventListener('click', () => this.showJoinInput());
        document.getElementById('joinRoomSubmit').addEventListener('click', () => this.joinRoom());
        document.getElementById('roomCodeInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });
        document.getElementById('cancelWaitBtn').addEventListener('click', () => this.cancelWaiting());
        document.getElementById('backToModes').addEventListener('click', () => this.backToModes());
        document.getElementById('sendChatBtn').addEventListener('click', () => this.sendChat());
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChat();
        });
    }

    connect() {
        const token = localStorage.getItem('token');
        
        this.socket = io({
            auth: { token }
        });

        this.socket.on('connect', () => {
            console.log('Connected to server');
            showToast('Connected to game server', 'success');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            showToast('Disconnected from server', 'error');
        });

        this.socket.on('game-start', (data) => this.handleGameStart(data));
        this.socket.on('move-made', (data) => this.handleMoveMade(data));
        this.socket.on('game-over', (data) => this.handleGameOver(data));
        this.socket.on('player-left', (data) => this.handlePlayerLeft(data));
        this.socket.on('rematch-requested', (data) => this.handleRematchRequest(data));
        this.socket.on('chat-message', (data) => this.handleChatMessage(data));

        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    showOnlineSection() {
        document.getElementById('modeSelection').style.display = 'none';
        this.onlineSection.classList.add('active');
        this.roomOptions.classList.remove('hidden');
        this.joinRoomInput.classList.add('hidden');
        this.waitingRoom.classList.add('hidden');
        
        if (!this.socket) {
            this.connect();
        }
    }

    createRoom() {
        if (!this.socket) this.connect();

        this.socket.emit('create-room', (response) => {
            if (response.success) {
                this.roomCode = response.roomCode;
                this.playerSymbol = 'X';
                this.displayRoomCode.textContent = response.roomCode;
                
                this.roomOptions.classList.add('hidden');
                this.waitingRoom.classList.remove('hidden');
                
                showToast('Room created! Share the code with a friend.', 'success');
            } else {
                showToast(response.error || 'Failed to create room', 'error');
            }
        });
    }

    showJoinInput() {
        this.roomOptions.classList.add('hidden');
        this.joinRoomInput.classList.remove('hidden');
        this.roomCodeInput.focus();
    }

    joinRoom() {
        const roomCode = this.roomCodeInput.value.trim().toUpperCase();
        
        if (!roomCode || roomCode.length !== 6) {
            showToast('Please enter a valid 6-character room code', 'error');
            return;
        }

        if (!this.socket) this.connect();

        this.socket.emit('join-room', roomCode, (response) => {
            if (response.success) {
                this.roomCode = roomCode;
                this.playerSymbol = 'O';
                showToast('Joined room successfully!', 'success');
            } else {
                showToast(response.error || 'Failed to join room', 'error');
            }
        });
    }

    cancelWaiting() {
        if (this.socket && this.roomCode) {
            this.socket.emit('leave-room', this.roomCode);
        }
        this.roomCode = null;
        this.playerSymbol = null;
        
        this.waitingRoom.classList.add('hidden');
        this.roomOptions.classList.remove('hidden');
    }

    backToModes() {
        this.cancelWaiting();
        this.onlineSection.classList.remove('active');
        document.getElementById('modeSelection').style.display = 'block';
    }

    handleGameStart(data) {
        console.log('Game started:', data);
        
        const myPlayer = data.room.players.find(p => p.id === this.socket.id);
        this.opponent = data.room.players.find(p => p.id !== this.socket.id);
        this.playerSymbol = myPlayer.symbol;
        this.isMyTurn = this.playerSymbol === 'X';

        // Update game state
        this.game.gameMode = 'online';
        this.game.gameActive = true;
        this.game.resetBoard();
        
        // Update player names
        document.getElementById('player1Name').textContent = 
            data.room.players.find(p => p.symbol === 'X').username;
        document.getElementById('player2Name').textContent = 
            data.room.players.find(p => p.symbol === 'O').username;

        // Show game UI
        this.onlineSection.classList.remove('active');
        document.getElementById('gameContainer').classList.add('active');
        this.onlineChat.classList.remove('hidden');

        // Update turn indicator
        this.updateTurnForOnline(data.room.currentTurn);
        
        // Add click handlers for online play
        this.setupOnlineCellClicks();
        
        showToast('Game started! Good luck!', 'success');
    }

    setupOnlineCellClicks() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.onclick = (e) => this.handleOnlineCellClick(e);
        });
    }

    handleOnlineCellClick(e) {
        if (!this.isMyTurn || !this.game.gameActive) return;
        
        const index = parseInt(e.target.dataset.index);
        
        if (this.game.board[index] !== null) return;

        this.socket.emit('make-move', {
            roomCode: this.roomCode,
            position: index
        }, (response) => {
            if (!response.success) {
                showToast(response.error || 'Failed to make move', 'error');
            }
        });
    }

    handleMoveMade(data) {
        console.log('Move made:', data);
        
        // Update board
        this.game.board[data.position] = data.symbol;
        const cell = document.querySelectorAll('.cell')[data.position];
        cell.textContent = data.symbol;
        cell.classList.add('taken', data.symbol.toLowerCase());

        // Update turn
        this.isMyTurn = data.currentTurn === this.playerSymbol;
        this.updateTurnForOnline(data.currentTurn);
    }

    updateTurnForOnline(currentTurn) {
        const turnText = document.getElementById('turnText');
        const turnIndicator = document.getElementById('turnIndicator');
        const player1Panel = document.getElementById('player1Panel');
        const player2Panel = document.getElementById('player2Panel');

        if (currentTurn === this.playerSymbol) {
            turnText.textContent = "Your Turn";
        } else {
            turnText.textContent = "Opponent's Turn";
        }

        turnIndicator.className = `turn-indicator ${currentTurn.toLowerCase()}-turn`;

        if (currentTurn === 'X') {
            player1Panel.classList.add('active');
            player2Panel.classList.remove('active');
        } else {
            player1Panel.classList.remove('active');
            player2Panel.classList.add('active');
        }
    }

    handleGameOver(data) {
        console.log('Game over:', data);
        this.game.gameActive = false;

        // Highlight winning line
        if (data.winningLine) {
            data.winningLine.forEach(index => {
                document.querySelectorAll('.cell')[index].classList.add('winning');
            });
        }

        // Determine result for current player
        let playerResult;
        if (data.isDraw) {
            playerResult = 'draw';
        } else if (data.winner.symbol === this.playerSymbol) {
            playerResult = 'win';
        } else {
            playerResult = 'loss';
        }

        // Show result modal
        setTimeout(() => {
            this.showOnlineResult(data, playerResult);
        }, 500);
    }

    showOnlineResult(data, playerResult) {
        const resultIcon = document.getElementById('resultIcon');
        const resultTitle = document.getElementById('resultTitle');
        const resultMessage = document.getElementById('resultMessage');
        const resultStats = document.getElementById('resultStats');

        if (data.isDraw) {
            resultIcon.textContent = '🤝';
            resultTitle.textContent = "It's a Draw!";
            resultTitle.className = 'result-title draw';
            resultMessage.textContent = 'Great game!';
        } else if (playerResult === 'win') {
            resultIcon.textContent = '🎉';
            resultIcon.classList.add('win');
            resultTitle.textContent = 'Victory!';
            resultTitle.className = 'result-title win';
            resultMessage.textContent = 'You won the online match!';
        } else {
            resultIcon.textContent = '😔';
            resultTitle.textContent = 'Defeat';
            resultTitle.className = 'result-title lose';
            resultMessage.textContent = `${data.winner.username} wins!`;
        }

        // Update user stats display
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            document.getElementById('resultPoints').textContent = 
                playerResult === 'win' ? '+10' : playerResult === 'loss' ? '-3' : '+2';
            resultStats.style.display = 'flex';
        } else {
            resultStats.style.display = 'none';
        }

        // Modify buttons for online play
        const playAgainBtn = document.getElementById('playAgainBtn');
        playAgainBtn.textContent = 'Request Rematch';
        playAgainBtn.onclick = () => this.requestRematch();

        document.getElementById('resultModal').classList.add('active');
    }

    requestRematch() {
        if (this.socket && this.roomCode) {
            this.socket.emit('request-rematch', this.roomCode);
            showToast('Rematch request sent!', 'info');
        }
    }

    handleRematchRequest(data) {
        if (confirm(`${data.from} wants a rematch! Accept?`)) {
            this.socket.emit('accept-rematch', this.roomCode);
        }
    }

    handlePlayerLeft(data) {
        showToast(`${data.player} left the game`, 'info');
        this.game.gameActive = false;
        
        setTimeout(() => {
            this.leaveOnlineGame();
        }, 2000);
    }

    leaveOnlineGame() {
        if (this.socket && this.roomCode) {
            this.socket.emit('leave-room', this.roomCode);
        }
        
        this.roomCode = null;
        this.playerSymbol = null;
        this.opponent = null;
        this.isMyTurn = false;
        
        document.getElementById('resultModal').classList.remove('active');
        document.getElementById('gameContainer').classList.remove('active');
        this.onlineChat.classList.add('hidden');
        document.getElementById('modeSelection').style.display = 'block';
        
        this.game.quitGame();
    }

    sendChat() {
        const message = this.chatInput.value.trim();
        if (!message || !this.socket || !this.roomCode) return;

        this.socket.emit('chat-message', {
            roomCode: this.roomCode,
            message
        });

        this.chatInput.value = '';
    }

    handleChatMessage(data) {
        const messageEl = document.createElement('div');
        messageEl.className = 'chat-message';
        messageEl.innerHTML = `<span class="sender">${data.from}:</span> ${this.escapeHtml(data.message)}`;
        this.chatMessages.appendChild(messageEl);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export for use
window.OnlineGameHandler = OnlineGameHandler;

// Toast notification helper
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

window.showToast = showToast;