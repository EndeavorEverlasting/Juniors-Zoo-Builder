// At the very start of init.js, before anything else
window.gameState = {
    currency: 100,
    buildings: {
        cage: { count: 0, cost: 100, word: 'CAGE', income: 1 },
        habitat: { count: 0, cost: 250, word: 'HABITAT', income: 2 },
        safari: { count: 0, cost: 500, word: 'SAFARI', income: 5 }
    },
    currentWord: '',
    typingProgress: '',
    hasStartedTyping: false,
    buildingGrid: [],
    wrongChar: null,
    gridSize: { rows: 3, cols: 8 },
    nextGridPos: { row: 0, col: 0 }
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a237e');
    gradient.addColorStop(1, '#3949ab');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const groundHeight = canvas.height * 0.3;
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);
}

// Initialize canvas size based on container
function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = 400;
    drawBackground();
}

// Initial setup
window.addEventListener('DOMContentLoaded', () => {
    // Initialize game components
    initAudioContext();
    resizeCanvas();
    updateDisplay();
    
    // Start animation loop only after everything is initialized
    requestAnimationFrame(gameLoop);
});

// Handle window resize
window.addEventListener('resize', resizeCanvas);
