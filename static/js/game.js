let gameState = {
    currency: 100,
    buildings: {
        house: { count: 0, cost: 100, word: 'BUILD', income: 1 },
        farm: { count: 0, cost: 250, word: 'FARM', income: 2 },
        factory: { count: 0, cost: 500, word: 'INDUSTRY', income: 5 }
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
const typingHint = document.getElementById('typing-hint');
const keyboardIcon = document.getElementById('keyboard-icon');
const nextKeyHint = document.getElementById('next-key-hint');
const nextKey = document.getElementById('next-key');
const floatingGuide = document.getElementById('floating-guide');
const bounceArrow = document.getElementById('bounce-arrow');

// Animation properties
const GRID_CELL_SIZE = 80;
const BUILDING_SIZE = 60;

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
        floatingGuide.style.top = '80px';
        floatingGuide.style.right = '20px';
        floatingGuide.style.left = 'auto';
        
        bounceArrow.style.display = 'block';
    }
}

function getNextGridPosition() {
    const pos = { ...gameState.nextGridPos };
    gameState.nextGridPos.col++;
    if (gameState.nextGridPos.col >= gameState.gridSize.cols) {
        gameState.nextGridPos.col = 0;
        gameState.nextGridPos.row++;
        if (gameState.nextGridPos.row >= gameState.gridSize.rows) {
            gameState.nextGridPos.row = 0;
        }
    }
    return pos;
}

function createParticles(x, y) {
    const particles = [];
    const colors = ['#FFD700', '#FFA500', '#FF69B4', '#00FF00', '#40E0D0'];
    for (let i = 0; i < 30; i++) {
        const angle = (Math.PI * 2 * i) / 30;
        const speed = 3 + Math.random() * 3;
        particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            size: 3 + Math.random() * 3,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }
    return particles;
}

function addBuilding(type, particles) {
    const gridPos = getNextGridPosition();
    const groundY = canvas.height * 0.7;
    const startX = (canvas.width - (gameState.gridSize.cols * GRID_CELL_SIZE)) / 2;
    
    const building = {
        type,
        x: startX + (gridPos.col * GRID_CELL_SIZE),
        y: groundY - (gridPos.row * GRID_CELL_SIZE),
        scale: 0,
        opacity: 0,
        particles,
        incomeText: {
            value: `+${gameState.buildings[type].income}/s`,
            y: 0,
            alpha: 1
        }
    };
    
    gameState.buildingGrid.push(building);
}

async function initGameState() {
    try {
        const response = await fetch('/get_game_state');
        const data = await response.json();
        gameState.currency = Math.max(data.currency, 100);
        gameState.buildings.house.count = data.houses;
        gameState.buildings.farm.count = data.farms;
        gameState.buildings.factory.count = data.factories;
        
        // Initialize buildings on the grid
        for (let i = 0; i < data.houses; i++) addBuilding('house', []);
        for (let i = 0; i < data.farms; i++) addBuilding('farm', []);
        for (let i = 0; i < data.factories; i++) addBuilding('factory', []);
        
        updateDisplay();
        updateAvailableBuildings();
    } catch (error) {
        console.error('Failed to initialize game state:', error);
    }
}

function updateDisplay() {
    const currencyDisplay = document.getElementById('currency');
    const oldValue = parseInt(currencyDisplay.textContent);
    const newValue = Math.floor(gameState.currency);
    
    if (oldValue !== newValue) {
        const diff = newValue - oldValue;
        if (diff < 0) {
            showFloatingText(canvas.width/2, canvas.height/2, diff.toString(), '#ff4444');
        }
        currencyDisplay.textContent = newValue;
    }
    
    document.getElementById('houses').textContent = gameState.buildings.house.count;
    document.getElementById('farms').textContent = gameState.buildings.farm.count;
    document.getElementById('factories').textContent = gameState.buildings.factory.count;
    updateTypingHint();
}

function showFloatingText(x, y, text, color) {
    const floatingText = {
        x,
        y,
        text,
        color,
        alpha: 1,
        velocity: -2
    };
    
    function animate() {
        if (floatingText.alpha <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = floatingText.alpha;
        ctx.fillStyle = floatingText.color;
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(floatingText.text, floatingText.x, floatingText.y);
        ctx.restore();
        
        floatingText.y += floatingText.velocity;
        floatingText.alpha -= 0.02;
        requestAnimationFrame(animate);
    }
    
    animate();
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
        
        let displayText = gameState.typingProgress;
        if (gameState.wrongChar) {
            displayText += `<span class="wrong-letter">${gameState.wrongChar}</span>`;
        }
        typingHint.innerHTML = `Type: <span class="typed-progress">${displayText}</span>${gameState.currentWord.slice(displayText.length)}`;
    }
}

function shakeElement(element) {
    element.classList.add('shake');
    setTimeout(() => element.classList.remove('shake'), 500);
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
                gameState.wrongChar = null;
                playCorrectKeySound();
                break;
            }
        }
    } else {
        const nextChar = gameState.currentWord[gameState.typingProgress.length];
        if (key === nextChar) {
            gameState.typingProgress += key;
            gameState.wrongChar = null;
            playCorrectKeySound();
            
            if (gameState.typingProgress === gameState.currentWord) {
                for (const [buildingType, building] of Object.entries(gameState.buildings)) {
                    if (building.word === gameState.currentWord) {
                        gameState.currency -= building.cost;
                        building.count++;
                        playBuildingComplete();
                        
                        const particles = createParticles(canvas.width/2, canvas.height/2);
                        addBuilding(buildingType, particles);
                        
                        showFloatingText(canvas.width/2, canvas.height/2, `-${building.cost}`, '#ff4444');
                        
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
                gameState.wrongChar = null;
            }
        } else {
            gameState.wrongChar = key;
            playWrongKeySound();
            shakeElement(typingHint);
        }
    }
    
    updateDisplay();
    updateAvailableBuildings();
}

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a237e');
    gradient.addColorStop(1, '#303f9f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);
}

function drawBuildings() {
    gameState.buildingGrid.forEach((building, index) => {
        if (building.scale < 1) {
            building.scale += 0.03;
        }
        if (building.opacity < 1) {
            building.opacity += 0.03;
        }
        
        ctx.save();
        ctx.globalAlpha = building.opacity;
        ctx.translate(building.x + BUILDING_SIZE/2, building.y + BUILDING_SIZE/2);
        ctx.scale(building.scale, building.scale);
        
        const color = getBuildingColor(building.type);
        ctx.fillStyle = color;
        
        switch(building.type) {
            case 'house':
                // Draw house (simple house shape)
                ctx.beginPath();
                ctx.moveTo(-BUILDING_SIZE/2, BUILDING_SIZE/2);
                ctx.lineTo(-BUILDING_SIZE/2, 0);
                ctx.lineTo(0, -BUILDING_SIZE/2);
                ctx.lineTo(BUILDING_SIZE/2, 0);
                ctx.lineTo(BUILDING_SIZE/2, BUILDING_SIZE/2);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'farm':
                // Draw farm (barn shape)
                ctx.beginPath();
                ctx.moveTo(-BUILDING_SIZE/2, BUILDING_SIZE/2);
                ctx.lineTo(-BUILDING_SIZE/2, 0);
                ctx.lineTo(0, -BUILDING_SIZE/2);
                ctx.lineTo(BUILDING_SIZE/2, 0);
                ctx.lineTo(BUILDING_SIZE/2, BUILDING_SIZE/2);
                ctx.closePath();
                ctx.fill();
                // Add some details
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(-BUILDING_SIZE/4, 0, BUILDING_SIZE/2, BUILDING_SIZE/2);
                break;
                
            case 'factory':
                // Draw factory (industrial building with chimney)
                ctx.fillRect(-BUILDING_SIZE/2, -BUILDING_SIZE/4, BUILDING_SIZE, BUILDING_SIZE * 3/4);
                ctx.fillRect(-BUILDING_SIZE/4, -BUILDING_SIZE/2, BUILDING_SIZE/6, BUILDING_SIZE/2);
                break;
        }
        
        ctx.restore();
        
        if (building.particles.length > 0) {
            building.particles.forEach((particle, i) => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.life -= 0.02;
                
                if (particle.life > 0) {
                    ctx.save();
                    ctx.globalAlpha = particle.life;
                    ctx.fillStyle = particle.color;
                    ctx.beginPath();
                    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                } else {
                    building.particles.splice(i, 1);
                }
            });
        }
        
        if (building.incomeText.alpha > 0) {
            ctx.save();
            ctx.globalAlpha = building.incomeText.alpha;
            ctx.fillStyle = '#4CAF50';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(
                building.incomeText.value,
                building.x + BUILDING_SIZE/2,
                building.y - 20 + building.incomeText.y
            );
            ctx.restore();
            
            building.incomeText.y -= 0.5;
            building.incomeText.alpha -= 0.01;
        }
    });
}

function getBuildingColor(buildingType) {
    switch(buildingType) {
        case 'house':
            return '#4CAF50';
        case 'farm':
            return '#FFC107';
        case 'factory':
            return '#F44336';
        default:
            return '#FFFFFF';
    }
}

function gameLoop() {
    resizeCanvas();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawBuildings();
    
    if (gameState.currentWord) {
        const fontSize = Math.min(canvas.width / 10, 64);
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(0, 255, 0, 0.5)';
        
        // Draw word shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillText(gameState.currentWord, canvas.width/2 + 2, canvas.height/3 + 2);
        
        // Draw word outline
        ctx.fillStyle = '#666666';
        ctx.fillText(gameState.currentWord, canvas.width/2, canvas.height/3);
        
        // Draw typed progress
        ctx.fillStyle = '#4CAF50';
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#4CAF50';
        ctx.fillText(
            gameState.typingProgress,
            canvas.width/2 - (ctx.measureText(gameState.currentWord).width/2) + 
            (ctx.measureText(gameState.typingProgress).width/2),
            canvas.height/3
        );
    }
    
    requestAnimationFrame(gameLoop);
}

// Initialize the game
document.addEventListener('keydown', handleKeyPress);
window.addEventListener('load', () => {
    initGameState();
    gameLoop();
});
