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
    if (!window.gameState.hasStartedTyping) {
        window.gameState.hasStartedTyping = true;
        typingHint.style.display = 'none';
        keyboardIcon.classList.add('visible');
        nextKeyHint.classList.add('visible');
        
        if (isMobileDevice()) {
            toggleVirtualKeyboard(true);
        }
    }
}

function handleKeyPress(event) {
    if (!window.gameState.hasStartedTyping) {
        showTypingStarted();
        return;
    }
    
    const key = event.key ? event.key.toUpperCase() : event.toUpperCase();
    console.log('Key pressed:', key); // Add debug logging
    
    // Handle backspace
    if (key === 'BACKSPACE') {
        if (window.gameState.typingProgress.length > 0) {
            window.gameState.typingProgress = window.gameState.typingProgress.slice(0, -1);
            playWrongKeySound();
            updateDisplay();
        }
        return;
    }

    // Only process alphabetic keys
    if (!/^[A-Z]$/.test(key)) {
        return;
    }

    // Debug logging
    console.log('Current word:', window.gameState.currentWord);
    console.log('Typing progress:', window.gameState.typingProgress);

    if (!window.gameState.currentWord) {
        // Start new word
        for (const [buildingType, building] of Object.entries(window.gameState.buildings)) {
            if (building.word.startsWith(key) && window.gameState.currency >= building.cost) {
                window.gameState.currentWord = building.word;
                window.gameState.typingProgress = key;
                playCorrectKeySound();
                updateDisplay();
                break;
            }
        }
    } else {
        // Continue current word
        const nextChar = window.gameState.currentWord[window.gameState.typingProgress.length];
        if (key === nextChar) {
            window.gameState.typingProgress += key;
            playCorrectKeySound();
            
            if (window.gameState.typingProgress === window.gameState.currentWord) {
                handleWordCompletion();
            }
        } else {
            playWrongKeySound();
            window.gameState.wrongChar = key;
            updateDisplay();
        }
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
    for (const [buildingType, building] of Object.entries(window.gameState.buildings)) {
        if (building.word === window.gameState.currentWord) {
            if (window.gameState.currency >= building.cost) {
                window.gameState.currency -= building.cost;
                building.count++;
                playBuildingComplete();
                
                const gridPos = {
                    x: (canvas.width - (window.gameState.gridSize.cols * GRID_CELL_SIZE)) / 2 + 
                       (window.gameState.nextGridPos.col * GRID_CELL_SIZE),
                    y: canvas.height * 0.7 - (window.gameState.nextGridPos.row * GRID_CELL_SIZE)
                };
                
                animateBuilding(buildingType, gridPos.x, gridPos.y);
                
                // Update grid position
                window.gameState.nextGridPos.col++;
                if (window.gameState.nextGridPos.col >= window.gameState.gridSize.cols) {
                    window.gameState.nextGridPos.col = 0;
                    window.gameState.nextGridPos.row++;
                    if (window.gameState.nextGridPos.row >= window.gameState.gridSize.rows) {
                        window.gameState.nextGridPos.row = 0;
                    }
                }
                
                fetch('/update_progress', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        attraction_type: buildingType,
                        currency: window.gameState.currency
                    })
                });
            }
            break;
        }
    }
    window.gameState.currentWord = '';
    window.gameState.typingProgress = '';
    window.gameState.wrongChar = null;
    updateDisplay();
}

function updateDisplay() {
    if (window.gameState.currentWord) {
        typingHint.innerHTML = window.gameState.currentWord.split('').map((char, index) => {
            if (index < window.gameState.typingProgress.length) {
                return `<span class="correct">${char}</span>`;
            } else if (index === window.gameState.typingProgress.length) {
                return `<span class="current">${char}</span>`;
            }
            return `<span class="remaining">${char}</span>`;
        }).join('');
        
        if (window.gameState.wrongChar) {
            typingHint.classList.add('shake');
            setTimeout(() => typingHint.classList.remove('shake'), 500);
        }
    } else {
        typingHint.textContent = 'Press any key to start building!';
        typingHint.classList.add('pulse');
    }
}

// Event Listeners
document.addEventListener('keydown', handleKeyPress);

document.addEventListener('touchstart', (e) => {
    if (!window.gameState.hasStartedTyping) {
        e.preventDefault();
        showTypingStarted();
        toggleVirtualKeyboard(true);
    }
}, { passive: false });

// Initialize game
updateDisplay();
if (isMobileDevice()) {
    createVirtualKeyboard();
}
