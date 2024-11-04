let gameState = {
    currency: 0,
    buildings: {
        house: { count: 0, cost: 100, word: 'BUILD' },
        farm: { count: 0, cost: 250, word: 'FARM' },
        factory: { count: 0, cost: 500, word: 'INDUSTRY' }
    },
    currentWord: '',
    typingProgress: ''
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Adjust canvas resolution to match display size
function resizeCanvas() {
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }
}

// Initialize game state from server
async function initGameState() {
    try {
        const response = await fetch('/get_game_state');
        const data = await response.json();
        gameState.currency = data.currency;
        gameState.buildings.house.count = data.houses;
        gameState.buildings.farm.count = data.farms;
        gameState.buildings.factory.count = data.factories;
        updateDisplay();
    } catch (error) {
        console.error('Failed to initialize game state:', error);
    }
}

function updateDisplay() {
    document.getElementById('currency').textContent = Math.floor(gameState.currency);
    document.getElementById('houses').textContent = gameState.buildings.house.count;
    document.getElementById('farms').textContent = gameState.buildings.farm.count;
    document.getElementById('factories').textContent = gameState.buildings.factory.count;
}

function handleKeyPress(event) {
    const key = event.key.toUpperCase();
    
    // Initialize audio context on first interaction
    if (typeof audioContext === 'undefined') {
        initAudioContext();
    }
    
    if (!gameState.currentWord) {
        // Start new word if none is active
        for (const [buildingType, building] of Object.entries(gameState.buildings)) {
            if (building.word.startsWith(key) && gameState.currency >= building.cost) {
                gameState.currentWord = building.word;
                gameState.typingProgress = key;
                playCorrectKeySound();
                break;
            }
        }
    } else {
        // Continue current word
        const nextChar = gameState.currentWord[gameState.typingProgress.length];
        if (key === nextChar) {
            gameState.typingProgress += key;
            playCorrectKeySound();
            
            if (gameState.typingProgress === gameState.currentWord) {
                // Word completed
                for (const [buildingType, building] of Object.entries(gameState.buildings)) {
                    if (building.word === gameState.currentWord) {
                        gameState.currency -= building.cost;
                        building.count++;
                        playBuildingComplete();
                        animateBuilding(buildingType);
                        
                        // Update server
                        fetch('/update_progress', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                building_type: buildingType,
                                currency: gameState.currency
                            })
                        }).catch(error => console.error('Failed to update progress:', error));
                        
                        break;
                    }
                }
                gameState.currentWord = '';
                gameState.typingProgress = '';
            }
        } else {
            playWrongKeySound();
            gameState.currentWord = '';
            gameState.typingProgress = '';
        }
    }
    
    updateDisplay();
}

function gameLoop() {
    // Resize canvas if needed
    resizeCanvas();
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw current word and progress
    if (gameState.currentWord) {
        const fontSize = Math.min(canvas.width / 20, 36);
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        
        // Draw word outline
        ctx.fillStyle = '#666666';
        ctx.fillText(gameState.currentWord, canvas.width / 2, canvas.height / 2);
        
        // Draw progress in green
        ctx.fillStyle = '#4CAF50';
        ctx.fillText(
            gameState.typingProgress + gameState.currentWord.slice(gameState.typingProgress.length),
            canvas.width / 2,
            canvas.height / 2
        );
    }
    
    // Passive income
    gameState.currency += (
        gameState.buildings.house.count * 1 +
        gameState.buildings.farm.count * 2 +
        gameState.buildings.factory.count * 5
    ) / 60;  // Per second divided by 60 for smooth animation
    
    updateDisplay();
    requestAnimationFrame(gameLoop);
}

// Initialize game
window.addEventListener('load', () => {
    resizeCanvas();
    initGameState();
});

document.addEventListener('keypress', handleKeyPress);
gameLoop();
