let gameState = {
    currency: {{ player.currency }},
    buildings: {
        house: { count: {{ player.houses }}, cost: 100, word: 'BUILD' },
        farm: { count: {{ player.farms }}, cost: 250, word: 'FARM' },
        factory: { count: {{ player.factories }}, cost: 500, word: 'INDUSTRY' }
    },
    currentWord: '',
    typingProgress: ''
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function updateDisplay() {
    document.getElementById('currency').textContent = gameState.currency;
    document.getElementById('houses').textContent = gameState.buildings.house.count;
    document.getElementById('farms').textContent = gameState.buildings.farm.count;
    document.getElementById('factories').textContent = gameState.buildings.factory.count;
}

function handleKeyPress(event) {
    const key = event.key.toUpperCase();
    
    if (!gameState.currentWord) {
        // Start new word if none is active
        for (let building in gameState.buildings) {
            if (gameState.buildings[building].word.startsWith(key) &&
                gameState.currency >= gameState.buildings[building].cost) {
                gameState.currentWord = gameState.buildings[building].word;
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
                for (let building in gameState.buildings) {
                    if (gameState.buildings[building].word === gameState.currentWord) {
                        gameState.currency -= gameState.buildings[building].cost;
                        gameState.buildings[building].count++;
                        playBuildingComplete();
                        animateBuilding(building);
                        
                        // Update server
                        fetch('/update_progress', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                building_type: building,
                                currency: gameState.currency
                            })
                        });
                        
                        break;
                    }
                }
                gameState.currentWord = '';
                gameState.typingProgress = '';
            }
        } else {
            playWrongKeySound();
        }
    }
    
    updateDisplay();
}

function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw current word and progress
    if (gameState.currentWord) {
        ctx.font = '24px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(gameState.currentWord, 10, 30);
        ctx.fillStyle = '#00ff00';
        ctx.fillText(gameState.typingProgress, 10, 30);
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

document.addEventListener('keypress', handleKeyPress);
gameLoop();
