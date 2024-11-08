// Keyboard layouts
const KEYBOARD_LAYOUTS = {
    QWERTY: [
        'QWERTYUIOP'.split(''),
        'ASDFGHJKL'.split(''),
        'ZXCVBNM'.split(''),
        ['BACKSPACE', 'RETURN']  // Add new row
    ],
    ABC: [
        'ABCDEFGHI'.split(''),
        'JKLMNOPQR'.split(''),
        'STUVWXYZ'.split(''),
        ['BACKSPACE', 'RETURN']  // Add new row
    ]
};

// Get DOM elements
const typingHint = document.getElementById('typing-hint');
const keyboardIcon = document.getElementById('keyboard-icon');
const nextKeyHint = document.getElementById('next-key-hint');
const nextKey = document.getElementById('next-key');
const floatingGuide = document.getElementById('floating-guide');
const bounceArrow = document.getElementById('bounce-arrow');

// Animation properties
const GRID_CELL_SIZE = 80;
const BUILDING_SIZE = 60;

let currentKeyboardLayout = 'QWERTY';
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
    container: null
};

function handleWordCompletion() {
    for (const [buildingType, building] of Object.entries(gameState.buildings)) {
        if (building.word === gameState.currentWord) {
            if (gameState.currency >= building.cost) {
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
                });
            }
            break;
        }
    }
    gameState.currentWord = '';
    gameState.typingProgress = '';
    gameState.wrongChar = null;
    updateDisplay();
}

function handleKeyPress(event) {
    const key = event.key.toUpperCase();
    
    if (typeof audioContext === 'undefined') {
        initAudioContext();
    }

    showTypingStarted();
    
    // Handle special keys
    if (key === 'BACKSPACE') {
        if (gameState.typingProgress.length > 0) {
            gameState.typingProgress = gameState.typingProgress.slice(0, -1);
            playWrongKeySound();
        }
        return;
    } else if (key === 'RETURN') {
        if (gameState.typingProgress === gameState.currentWord) {
            handleWordCompletion();
        }
        return;
    }
    
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
                handleWordCompletion();
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

[Rest of the game.js file remains unchanged...]
