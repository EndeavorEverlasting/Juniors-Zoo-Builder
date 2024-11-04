let gameState = {
    currency: 100, // Start with some initial currency
    buildings: {
        house: { count: 0, cost: 100, word: 'BUILD', income: 1 },
        farm: { count: 0, cost: 250, word: 'FARM', income: 2 },
        factory: { count: 0, cost: 500, word: 'INDUSTRY', income: 5 }
    },
    currentWord: '',
    typingProgress: ''
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const typingHint = document.getElementById('typing-hint');

function resizeCanvas() {
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }
}

async function initGameState() {
    try {
        const response = await fetch('/get_game_state');
        const data = await response.json();
        gameState.currency = Math.max(data.currency, 100); // Ensure minimum starting currency
        gameState.buildings.house.count = data.houses;
        gameState.buildings.farm.count = data.farms;
        gameState.buildings.factory.count = data.factories;
        updateDisplay();
        updateAvailableBuildings();
    } catch (error) {
        console.error('Failed to initialize game state:', error);
    }
}

function updateDisplay() {
    document.getElementById('currency').textContent = Math.floor(gameState.currency);
    document.getElementById('houses').textContent = gameState.buildings.house.count;
    document.getElementById('farms').textContent = gameState.buildings.farm.count;
    document.getElementById('factories').textContent = gameState.buildings.factory.count;
    updateTypingHint();
}

function updateTypingHint() {
    if (!gameState.currentWord) {
        let availableBuildings = [];
        for (const [type, building] of Object.entries(gameState.buildings)) {
            if (gameState.currency >= building.cost) {
                availableBuildings.push(`Type "${building.word}" for a ${type} (${building.cost} coins)`);
            }
        }
        typingHint.textContent = availableBuildings.length > 0 
            ? availableBuildings[0] // Show only one hint at a time for clarity
            : 'Earn more coins to build!';
    } else {
        typingHint.textContent = `Type: ${gameState.currentWord} (Progress: ${gameState.typingProgress})`;
    }
}

function updateAvailableBuildings() {
    const buildingItems = document.querySelectorAll('.building-item');
    buildingItems.forEach(item => {
        const buildingWord = item.querySelector('.typing-word').textContent;
        const building = Object.values(gameState.buildings).find(b => b.word === buildingWord);
        if (building && gameState.currency < building.cost) {
            item.style.opacity = '0.5';
        } else {
            item.style.opacity = '1';
        }
    });
}

function handleKeyPress(event) {
    const key = event.key.toUpperCase();
    
    if (typeof audioContext === 'undefined') {
        initAudioContext();
    }
    
    if (!gameState.currentWord) {
        for (const [buildingType, building] of Object.entries(gameState.buildings)) {
            if (building.word.startsWith(key) && gameState.currency >= building.cost) {
                gameState.currentWord = building.word;
                gameState.typingProgress = key;
                playCorrectKeySound();
                break;
            }
        }
    } else {
        const nextChar = gameState.currentWord[gameState.typingProgress.length];
        if (key === nextChar) {
            gameState.typingProgress += key;
            playCorrectKeySound();
            
            if (gameState.typingProgress === gameState.currentWord) {
                for (const [buildingType, building] of Object.entries(gameState.buildings)) {
                    if (building.word === gameState.currentWord) {
                        gameState.currency -= building.cost;
                        building.count++;
                        playBuildingComplete();
                        animateBuilding(buildingType);
                        
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
    updateAvailableBuildings();
}

function drawBackground() {
    // Draw sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a237e');
    gradient.addColorStop(1, '#303f9f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw ground
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);
}

function gameLoop() {
    resizeCanvas();
    
    // Clear and draw background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    
    // Draw current word
    if (gameState.currentWord) {
        const fontSize = Math.min(canvas.width / 15, 48);
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Draw word shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillText(gameState.currentWord, canvas.width/2 + 2, canvas.height/3 + 2);
        
        // Draw word outline
        ctx.fillStyle = '#666666';
        ctx.fillText(gameState.currentWord, canvas.width/2, canvas.height/3);
        
        // Draw progress in bright color
        ctx.fillStyle = '#4CAF50';
        const progressText = gameState.typingProgress + '_';
        ctx.fillText(
            progressText,
            canvas.width/2 - ((gameState.currentWord.length - progressText.length) * fontSize/4),
            canvas.height/3
        );
    }
    
    // Passive income
    gameState.currency += (
        gameState.buildings.house.count * gameState.buildings.house.income +
        gameState.buildings.farm.count * gameState.buildings.farm.income +
        gameState.buildings.factory.count * gameState.buildings.factory.income
    ) / 60;
    
    updateDisplay();
    requestAnimationFrame(gameLoop);
}

// Initialize game
window.addEventListener('load', () => {
    resizeCanvas();
    initGameState();
    gameLoop();
});

document.addEventListener('keypress', handleKeyPress);
