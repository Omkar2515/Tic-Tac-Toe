/**
 * Main Application Entry Point
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize game
    const game = new TicTacToeGame();
    const onlineHandler = new OnlineGameHandler(game);
    
    // Create particles
    createParticles();
    
    // Check authentication status
    checkAuth();
    
    // Initialize mode selection
    initModeSelection(game, onlineHandler);
    
    // Load leaderboard
    loadLeaderboard();
    
    // Setup event listeners
    setupEventListeners(game, onlineHandler);
});

function createParticles() {
    const particlesContainer = document.getElementById('particles');
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (15 + Math.random() * 10) + 's';
        particlesContainer.appendChild(particle);
    }
}

async function checkAuth() {
    const token = localStorage.getItem('token');
    const guestNav = document.getElementById('guestNav');
    const userNav = document.getElementById('userNav');
    const statsSection = document.getElementById('statsSection');
    
    if (token) {
        try {
            const response = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                updateUserUI(data.user);
                guestNav.classList.add('hidden');
                userNav.classList.remove('hidden');
                statsSection.classList.remove('hidden');
                loadUserStats(data.user);
            } else {
                clearAuth();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            clearAuth();
        }
    } else {
        guestNav.classList.remove('hidden');
        userNav.classList.add('hidden');
        statsSection.classList.add('hidden');
    }
}

function updateUserUI(user) {
    document.getElementById('userName').textContent = user.username;
    document.getElementById('userPoints').textContent = user.points || 0;
    document.getElementById('userAvatar').textContent = user.username.charAt(0).toUpperCase();
}

function loadUserStats(user) {
    document.getElementById('statTotalGames').textContent = user.total_games || 0;
    document.getElementById('statWins').textContent = user.wins || 0;
    
    const winRate = user.total_games > 0 
        ? ((user.wins / user.total_games) * 100).toFixed(1) 
        : 0;
    document.getElementById('statWinRate').textContent = winRate + '%';
    document.getElementById('statBestStreak').textContent = user.best_win_streak || 0;
    document.getElementById('statRank').textContent = user.rank ? `#${user.rank}` : '#-';
}

function clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.getElementById('guestNav').classList.remove('hidden');
    document.getElementById('userNav').classList.add('hidden');
    document.getElementById('statsSection').classList.add('hidden');
}

function initModeSelection(game, onlineHandler) {
    const modeCards = document.querySelectorAll('.mode-card');
    const difficultySection = document.getElementById('difficultySelection');
    const startSection = document.getElementById('startSection');
    const difficultyBtns = document.querySelectorAll('.difficulty-btn');
    
    let selectedMode = null;
    let selectedDifficulty = 'medium';

    modeCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove active from all cards
            modeCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            selectedMode = card.dataset.mode;

            if (selectedMode === 'vs-ai') {
                difficultySection.classList.remove('hidden');
                startSection.classList.remove('hidden');
            } else if (selectedMode === 'pvp-local') {
                difficultySection.classList.add('hidden');
                startSection.classList.remove('hidden');
            } else if (selectedMode === 'online') {
                difficultySection.classList.add('hidden');
                startSection.classList.add('hidden');
                onlineHandler.showOnlineSection();
            }
        });
    });

    difficultyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            difficultyBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedDifficulty = btn.dataset.difficulty;
        });
    });

    // Set default difficulty
    document.querySelector('.difficulty-btn.medium').classList.add('active');

    document.getElementById('startGameBtn').addEventListener('click', () => {
        if (selectedMode) {
            game.startGame(selectedMode, selectedDifficulty);
        }
    });
}

async function loadLeaderboard() {
    const leaderboardBody = document.getElementById('leaderboardBody');
    
    try {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        const response = await fetch('/api/leaderboard', { headers });
        
        if (!response.ok) {
            throw new Error('Failed to fetch leaderboard');
        }
        
        const data = await response.json();

        // Check if leaderboard exists and has data
        if (!data.leaderboard || data.leaderboard.length === 0) {
            leaderboardBody.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                    No players yet. Be the first to play!
                </div>
            `;
            return;
        }

        leaderboardBody.innerHTML = data.leaderboard.map((player, index) => {
            const isCurrentUser = data.currentUser && player.id === data.currentUser.id;
            const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
            const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
            
            return `
                <div class="leaderboard-row ${isCurrentUser ? 'current-user' : ''}">
                    <div class="rank ${rankClass}">${rankEmoji || player.rank}</div>
                    <div class="player-info">
                        <div class="player-avatar-sm">${player.username.charAt(0).toUpperCase()}</div>
                        <span>${player.username}</span>
                    </div>
                    <div>${player.wins || 0}</div>
                    <div>${player.losses || 0}</div>
                    <div>🔥 ${player.best_win_streak || 0}</div>
                    <div class="points-badge">⭐ ${player.points || 0}</div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Failed to load leaderboard:', error);
        leaderboardBody.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                No players yet. Register and play to be on the leaderboard!
            </div>
        `;
    }
}

function setupEventListeners(game, onlineHandler) {
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        } catch (error) {
            console.error('Logout error:', error);
        }
        clearAuth();
        window.location.reload();
    });

    // Refresh leaderboard
    document.getElementById('refreshLeaderboard').addEventListener('click', () => {
        loadLeaderboard();
        showToast('Leaderboard refreshed!', 'success');
    });

    // Listen for user updates
    window.addEventListener('userUpdated', (e) => {
        updateUserUI(e.detail);
        loadUserStats(e.detail);
        loadLeaderboard();
    });
}