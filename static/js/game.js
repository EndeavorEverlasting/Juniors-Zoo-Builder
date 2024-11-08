// Get DOM elements
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

let gameState = {
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

let virtualKeyboard = {
    visible: false,
    keys: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    container: null
};

function initGameState() {
    gameState = {
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
}

function showTypingStarted() {
    gameState.hasStartedTyping = true;
    typingHint.style.opacity = '0';
    keyboardIcon.classList.add('visible');
    nextKeyHint.classList.add('visible');
    if (isMobileDevice()) {
        toggleVirtualKeyboard(true);
    }
}

function isMobileDevice() {
    return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
}

function createVirtualKeyboard() {
    virtualKeyboard.container = document.createElement('div');
    virtualKeyboard.container.className = 'virtual-keyboard';
    virtualKeyboard.container.style.display = 'none';
    
    const keyboardLayout = document.createElement('div');
    keyboardLayout.className = 'keyboard-layout';
    
    virtualKeyboard.keys.forEach(key => {
        const keyButton = document.createElement('button');
        keyButton.className = 'keyboard-key';
        keyButton.textContent = key;
        keyButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleKeyPress({ key });
        });
        keyboardLayout.appendChild(keyButton);
    });
    
    virtualKeyboard.container.appendChild(keyboardLayout);
    document.body.appendChild(virtualKeyboard.container);
}

function toggleVirtualKeyboard(show) {
    if (!virtualKeyboard.container) {
        createVirtualKeyboard();
    }
    virtualKeyboard.visible = show;
    virtualKeyboard.container.style.display = show ? 'block' : 'none';
    
    if (show) {
        document.body.classList.add('keyboard-visible');
    } else {
        document.body.classList.remove('keyboard-visible');
    }
}

function updateUIElementsPosition() {
    if (isMobileDevice()) {
        typingHint.style.fontSize = '1rem';
        typingHint.style.padding = '10px 20px';
        keyboardIcon.style.fontSize = '1.5rem';
    } else {
        typingHint.style.fontSize = '1.4rem';
        typingHint.style.padding = '15px 30px';
        keyboardIcon.style.fontSize = '2rem';
    }
}

function resizeCanvas() {
    const container = canvas.parentElement;
    const displayWidth = container.clientWidth;
    const displayHeight = isMobileDevice() ? window.innerHeight * 0.4 : 400;
    
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        
        gameState.gridSize.cols = Math.floor(displayWidth / GRID_CELL_SIZE);
        gameState.gridSize.rows = Math.floor(displayHeight * 0.3 / GRID_CELL_SIZE);
        
        updateUIElementsPosition();
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
                        
                        const gridPos = {
                            x: (canvas.width - (gameState.gridSize.cols * GRID_CELL_SIZE)) / 2 + 
                               (gameState.nextGridPos.col * GRID_CELL_SIZE),
                            y: canvas.height * 0.7 - (gameState.nextGridPos.row * GRID_CELL_SIZE)
                        };
                        
                        animateBuilding(buildingType, gridPos.x, gridPos.y);
                        
                        // Update grid position
                        gameState.nextGridPos.col++;
                        if (gameState.nextGridPos.col >= gameState.gridSize.cols) {
                            gameState.nextGridPos.col = 0;
                            gameState.nextGridPos.row++;
                            if (gameState.nextGridPos.row >= gameState.gridSize.rows) {
                                gameState.nextGridPos.row = 0;
                            }
                        }
                        
                        fetch('/update_progress', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                attraction_type: buildingType,
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
            typingHint.classList.add('shake');
            setTimeout(() => typingHint.classList.remove('shake'), 500);
        }
    }
    
    updateDisplay();
    updateAvailableBuildings();
}

function updateDisplay() {
    document.getElementById('currency').textContent = Math.floor(gameState.currency);
    document.getElementById('cages').textContent = gameState.buildings.cage.count;
    document.getElementById('habitats').textContent = gameState.buildings.habitat.count;
    document.getElementById('safaris').textContent = gameState.buildings.safari.count;
    
    // Update typing hint
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
    } else {
        const nextChar = gameState.currentWord[gameState.typingProgress.length];
        nextKey.textContent = nextChar;
        
        let displayText = gameState.typingProgress;
        if (gameState.wrongChar) {
            displayText += `<span class="wrong-letter">${gameState.wrongChar}</span>`;
        }
        typingHint.innerHTML = `Type: <span class="typed-progress">${displayText}</span>${gameState.currentWord.slice(displayText.length)}`;
    }
}

// Mobile touch handling
document.addEventListener('touchstart', (e) => {
    if (!gameState.hasStartedTyping) {
        e.preventDefault();
        showTypingStarted();
        toggleVirtualKeyboard(true);
    }
}, { passive: false });

// Initialize the game
document.addEventListener('keypress', handleKeyPress);
window.addEventListener('load', () => {
    resizeCanvas();
    initGameState();
    if (isMobileDevice()) {
        createVirtualKeyboard();
        updateUIElementsPosition();
    }
    gameLoop();
});

window.addEventListener('resize', () => {
    resizeCanvas();
    updateUIElementsPosition();
});
