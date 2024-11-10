// Keyboard layouts
const KEYBOARD_LAYOUTS = {
    QWERTY: [
        'QWERTYUIOP'.split(''),
        'ASDFGHJKL'.split(''),
        'ZXCVBNM'.split(''),
        ['BACKSPACE', 'RETURN']
    ],
    ABC: [
        'ABCDEFGHI'.split(''),
        'JKLMNOPQR'.split(''),
        'STUVWXYZ'.split(''),
        ['BACKSPACE', 'RETURN']
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
let virtualKeyboard = {
    visible: false,
    container: null
};

function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function showTypingStarted() {
    gameState.hasStartedTyping = true;
    typingHint.style.display = 'none';
    keyboardIcon.classList.add('visible');
    nextKeyHint.classList.add('visible');
    initAudioContext();
    if (isMobileDevice()) {
        toggleVirtualKeyboard(true);
    }
}

function toggleVirtualKeyboard(show) {
    if (!virtualKeyboard.container) {
        createVirtualKeyboard();
    }
    virtualKeyboard.visible = show;
    virtualKeyboard.container.style.display = show ? 'block' : 'none';
    if (show) {
        document.body.classList.add('has-virtual-keyboard');
    } else {
        document.body.classList.remove('has-virtual-keyboard');
    }
}

function createVirtualKeyboard() {
    virtualKeyboard.container = document.createElement('div');
    virtualKeyboard.container.className = 'virtual-keyboard';
    updateVirtualKeyboard();
    document.body.appendChild(virtualKeyboard.container);
}

function updateVirtualKeyboard() {
    if (!virtualKeyboard.container) return;
    
    const layout = KEYBOARD_LAYOUTS[currentKeyboardLayout];
    virtualKeyboard.container.innerHTML = `
        <button class="keyboard-layout-toggle" onclick="toggleKeyboardLayout()">
            Switch to ${currentKeyboardLayout === 'QWERTY' ? 'ABC' : 'QWERTY'}
        </button>
        <div class="keyboard-layout">
            ${layout.map((row, rowIndex) => `
                <div class="keyboard-row">
                    ${row.map(key => `
                        <button class="keyboard-key ${key.length > 1 ? 'special-key' : ''}"
                                onclick="handleVirtualKeyPress('${key}')">
                            ${key}
                        </button>
                    `).join('')}
                </div>
            `).join('')}
        </div>
    `;
}

function toggleKeyboardLayout() {
    currentKeyboardLayout = currentKeyboardLayout === 'QWERTY' ? 'ABC' : 'QWERTY';
    updateVirtualKeyboard();
}

function handleVirtualKeyPress(key) {
    handleKeyPress({ key: key, preventDefault: () => {} });
}

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

    if (!gameState.hasStartedTyping) {
        showTypingStarted();
        return;
    }
    
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

// Event Listeners
document.addEventListener('keydown', handleKeyPress);

document.addEventListener('touchstart', (e) => {
    if (!gameState.hasStartedTyping) {
        e.preventDefault();
        showTypingStarted();
        toggleVirtualKeyboard(true);
    }
}, { passive: false });

function updateDisplay() {
    if (gameState.currentWord) {
        typingHint.innerHTML = gameState.currentWord.split('').map((char, index) => {
            if (index < gameState.typingProgress.length) {
                return `<span class="correct">${char}</span>`;
            } else if (index === gameState.typingProgress.length) {
                return `<span class="current">${char}</span>`;
            }
            return `<span class="remaining">${char}</span>`;
        }).join('');
        
        if (gameState.wrongChar) {
            typingHint.classList.add('shake');
            setTimeout(() => typingHint.classList.remove('shake'), 500);
        }
    } else {
        typingHint.textContent = 'Press any key to start building!';
        typingHint.classList.add('pulse');
    }
}

function updateAvailableBuildings() {
    const buildingItems = document.querySelectorAll('.building-item');
    buildingItems.forEach(item => {
        const wordElement = item.querySelector('.typing-word');
        if (wordElement) {
            const word = wordElement.textContent;
            if (gameState.currentWord === word) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        }
    });
}

// Initialize game
updateDisplay();
if (isMobileDevice()) {
    createVirtualKeyboard();
}
