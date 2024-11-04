const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const buildings = {
    house: { cost: 10, word: 'house', cps: 0.1 },
    farm: { cost: 50, word: 'farm', cps: 0.5 },
    castle: { cost: 200, word: 'castle', cps: 2.0 }
};

let gameState = {
    coins: 0,
    currentWord: '',
    targetWord: '',
    buildings: []
};

function initGame() {
    canvas.width = window.innerWidth * 0.8;
    canvas.height = window.innerHeight * 0.8;
    loadGameState();
    requestAnimationFrame(gameLoop);
}

function loadGameState() {
    fetch('/get_offline_progress')
        .then(response => response.json())
        .then(data => {
            gameState.coins += data.offline_earnings;
            updateUI();
        });
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateCoins();
    drawBuildings();
    drawUI();
    requestAnimationFrame(gameLoop);
}

function updateCoins() {
    const totalCPS = gameState.buildings.reduce((sum, building) => 
        sum + buildings[building.type].cps, 0);
    gameState.coins += totalCPS / 60; // Convert CPS to per-frame
}

function drawBuildings() {
    gameState.buildings.forEach(building => {
        const img = document.querySelector(`img[alt="${building.type.charAt(0).toUpperCase() + building.type.slice(1)}"]`);
        if (img) {
            ctx.drawImage(img, building.x, building.y, 50, 50);
        }
    });
}

function drawUI() {
    document.getElementById('coinCount').textContent = Math.floor(gameState.coins);
    
    if (gameState.targetWord) {
        ctx.font = '24px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        
        const typed = gameState.currentWord;
        const remaining = gameState.targetWord.slice(typed.length);
        
        ctx.fillStyle = '#00ff00';
        ctx.fillText(typed, canvas.width / 2, 50);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(remaining, canvas.width / 2 + ctx.measureText(typed).width, 50);
    }
}

function selectBuilding(type) {
    if (gameState.coins >= buildings[type].cost) {
        gameState.targetWord = buildings[type].word;
        gameState.currentWord = '';
    }
}

document.addEventListener('keypress', (e) => {
    const char = e.key.toLowerCase();
    if (gameState.targetWord) {
        if (char === gameState.targetWord[gameState.currentWord.length]) {
            gameState.currentWord += char;
            playCorrectSound();
            if (gameState.currentWord === gameState.targetWord) {
                constructBuilding(gameState.targetWord);
                gameState.targetWord = '';
                gameState.currentWord = '';
            }
        } else {
            playWrongSound();
        }
        updateUI();
    }
});

function constructBuilding(type) {
    if (gameState.coins >= buildings[type].cost) {
        gameState.coins -= buildings[type].cost;
        gameState.buildings.push({
            type,
            x: Math.random() * (canvas.width - 100),
            y: canvas.height - 100
        });
        saveGameState();
    }
}

function saveGameState() {
    fetch('/update_progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gameState)
    });
}

window.addEventListener('load', initGame);
