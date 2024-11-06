let gameState = {
    currency: 100, // Start with some initial currency
    buildings: {
        house: { count: 0, cost: 100, word: 'BUILD', income: 1 },
        farm: { count: 0, cost: 250, word: 'FARM', income: 2 },
        factory: { count: 0, cost: 500, word: 'INDUSTRY', income: 5 }
    },
    currentWord: '',
    typingProgress: '',
    hasStartedTyping: false
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const typingHint = document.getElementById('typing-hint');
const keyboardIcon = document.getElementById('keyboard-icon');
const nextKeyHint = document.getElementById('next-key-hint');
const nextKey = document.getElementById('next-key');
const floatingGuide = document.getElementById('floating-guide');
const bounceArrow = document.getElementById('bounce-arrow');

function resizeCanvas() {
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }
}

function showTypingStarted() {
    if (!gameState.hasStartedTyping) {
        gameState.hasStartedTyping = true;
        keyboardIcon.classList.add('visible');
        typingHint.style.animation = 'none';
        floatingGuide.style.display = 'block';
        bounceArrow.style.display = 'block';
        
        // Position the floating guide and arrow
        const canvasRect = canvas.getBoundingClientRect();
        floatingGuide.style.top = `${canvasRect.top + 100}px`;
        floatingGuide.style.left = `${canvasRect.left + canvasRect.width/2 - 100}px`;
        bounceArrow.style.top = `${canvasRect.top + 150}px`;
        bounceArrow.style.left = `${canvasRect.left + canvasRect.width/2 - 20}px`;
    }
}

async function initGameState() {
    try {
        const response = await fetch('/get_game_state');
        const data = await response.json();
        gameState.currency = Math.max(data.currency, 100);
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
        typingHint.textContent = gameState.hasStartedTyping ? 
            (availableBuildings.length > 0 ? availableBuildings[0] : 'Earn more coins to build!') :
            'Press any key to start building!';
            
        nextKeyHint.classList.remove('visible');
    } else {
        const nextChar = gameState.currentWord[gameState.typingProgress.length];
        nextKeyHint.classList.add('visible');
        nextKey.textContent = nextChar;
        typingHint.textContent = `Type: ${gameState.currentWord}`;
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

    showTypingStarted();
    
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
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    
    if (gameState.currentWord) {
        const fontSize = Math.min(canvas.width / 10, 64); // Larger font size
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Draw glowing effect
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(0, 255, 0, 0.5)';
        
        // Draw word shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillText(gameState.currentWord, canvas.width/2 + 2, canvas.height/3 + 2);
        
        // Draw remaining letters
        ctx.fillStyle = '#666666';
        ctx.fillText(gameState.currentWord, canvas.width/2, canvas.height/3);
        
        // Draw typed letters in green
        ctx.fillStyle = '#4CAF50';
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#4CAF50';
        ctx.fillText(
            gameState.typingProgress,
            canvas.width/2 - ((gameState.currentWord.length - gameState.typingProgress.length) * fontSize/4),
            canvas.height/3
        );
        
        // Reset shadow
        ctx.shadowBlur = 0;
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
